const express = require('express');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// GET /api/bills - list bills
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { patient_id, date, bill_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (patient_id) { params.push(patient_id); where.push(`b.patient_id = $${params.length}`); }
    if (date) { params.push(date); where.push(`DATE(b.created_at) = $${params.length}`); }
    if (bill_type) { params.push(bill_type); where.push(`b.bill_type = $${params.length}`); }

    const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const countResult = await pool.query(`SELECT COUNT(*) FROM bills b ${whereStr}`, params);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT b.*, p.name as patient_name, p.patient_id as patient_code,
              json_agg(ms.* ORDER BY ms.created_at) FILTER (WHERE ms.id IS NOT NULL) as items
       FROM bills b
       JOIN patients p ON p.id = b.patient_id
       LEFT JOIN medicine_sales ms ON ms.bill_id = b.id
       ${whereStr}
       GROUP BY b.id, p.name, p.patient_id
       ORDER BY b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      bills: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// GET /api/bills/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.*, p.name as patient_name, p.patient_id as patient_code, p.mobile, p.address,
              u.name as created_by_name,
              json_agg(ms.* ORDER BY ms.created_at) FILTER (WHERE ms.id IS NOT NULL) as items
       FROM bills b
       JOIN patients p ON p.id = b.patient_id
       LEFT JOIN users u ON u.id = b.created_by
       LEFT JOIN medicine_sales ms ON ms.bill_id = b.id
       WHERE b.id = $1
       GROUP BY b.id, p.name, p.patient_id, p.mobile, p.address, u.name`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bill not found' });
    res.json({ bill: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/bills - create bill with line items
router.post('/', authenticate, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      patient_id, appointment_id, bill_type = 'pharmacy',
      items = [], discount_percent = 0, discount_amount = 0,
      tax_amount = 0, paid_amount, payment_method = 'cash', payment_status = 'paid', notes
    } = req.body;

    if (!patient_id || items.length === 0) {
      return res.status(400).json({ error: 'Patient and at least one item are required' });
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const effectiveDiscount = discount_amount > 0 ? discount_amount : (subtotal * discount_percent / 100);
    const totalAmount = subtotal - effectiveDiscount + tax_amount;

    // Create bill
    const billResult = await client.query(
      `INSERT INTO bills (patient_id, appointment_id, bill_type, subtotal, discount_percent, discount_amount, tax_amount, total_amount, paid_amount, payment_method, payment_status, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [patient_id, appointment_id || null, bill_type, subtotal, discount_percent, effectiveDiscount,
       tax_amount, totalAmount, paid_amount || totalAmount, payment_method, payment_status, notes, req.user.id]
    );
    const bill = billResult.rows[0];

    // Insert line items and deduct stock
    for (const item of items) {
      await client.query(
        `INSERT INTO medicine_sales (bill_id, medicine_id, medicine_name, batch_number, quantity, unit_price, discount_percent, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [bill.id, item.medicine_id, item.medicine_name, item.batch_number || null,
         item.quantity, item.unit_price, item.discount_percent || 0,
         item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100)]
      );

      // Deduct stock
      await client.query(
        'UPDATE medicines SET stock_quantity = stock_quantity - $1 WHERE id = $2 AND stock_quantity >= $1',
        [item.quantity, item.medicine_id]
      );
    }

    await client.query('COMMIT');

    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_BILL', entityType: 'bill', entityId: bill.id, entityName: bill.bill_number,
      description: `Created ${bill_type} bill ${bill.bill_number} for ₹${totalAmount}`,
    });

    res.status(201).json({ bill });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
