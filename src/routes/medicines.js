const express = require('express');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// GET /api/medicines - list with search & pagination
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search = '', category, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = ['is_active = true'];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR generic_name ILIKE $${params.length} OR batch_number ILIKE $${params.length})`);
    }
    if (category) { params.push(category); where.push(`category = $${params.length}`); }

    const whereStr = 'WHERE ' + where.join(' AND ');
    const countResult = await pool.query(`SELECT COUNT(*) FROM medicines ${whereStr}`, params);

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT * FROM medicines ${whereStr}
       ORDER BY name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      medicines: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// GET /api/medicines/search - smart 3-char search for billing
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ medicines: [] });

    const result = await pool.query(
      `SELECT id, name, generic_name, stock_quantity, selling_price, unit, batch_number, expiry_date
       FROM medicines
       WHERE is_active = true AND stock_quantity > 0
         AND (name ILIKE $1 OR generic_name ILIKE $1)
       ORDER BY name ASC
       LIMIT 15`,
      [`%${q}%`]
    );
    res.json({ medicines: result.rows });
  } catch (err) { next(err); }
});

// GET /api/medicines/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM medicines WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicine not found' });
    res.json({ medicine: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/medicines
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      name, generic_name, category, batch_number, stock_quantity,
      unit, purchase_price, selling_price, mrp, expiry_date,
      manufacturer, description, requires_prescription, low_stock_threshold
    } = req.body;

    if (!name || !selling_price) {
      return res.status(400).json({ error: 'Medicine name and selling price are required' });
    }

    const result = await pool.query(
      `INSERT INTO medicines (name, generic_name, category, batch_number, stock_quantity,
        unit, purchase_price, selling_price, mrp, expiry_date, manufacturer, description,
        requires_prescription, low_stock_threshold, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [name, generic_name, category || 'General', batch_number, stock_quantity || 0,
       unit || 'Tablet', purchase_price || 0, selling_price, mrp || selling_price,
       expiry_date || null, manufacturer, description, requires_prescription || false,
       low_stock_threshold || 10, req.user.id]
    );

    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_MEDICINE', entityType: 'medicine', entityId: result.rows[0].id,
      entityName: name, description: `Added medicine: ${name}`,
    });

    res.status(201).json({ medicine: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/medicines/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      name, generic_name, category, batch_number, stock_quantity,
      unit, purchase_price, selling_price, mrp, expiry_date,
      manufacturer, description, requires_prescription, low_stock_threshold, is_active
    } = req.body;

    const result = await pool.query(
      `UPDATE medicines SET
        name = COALESCE($1, name), generic_name = $2, category = COALESCE($3, category),
        batch_number = $4, stock_quantity = COALESCE($5, stock_quantity),
        unit = COALESCE($6, unit), purchase_price = COALESCE($7, purchase_price),
        selling_price = COALESCE($8, selling_price), mrp = $9, expiry_date = $10,
        manufacturer = $11, description = $12, requires_prescription = COALESCE($13, requires_prescription),
        low_stock_threshold = COALESCE($14, low_stock_threshold), is_active = COALESCE($15, is_active)
       WHERE id = $16 RETURNING *`,
      [name, generic_name, category, batch_number, stock_quantity ? parseInt(stock_quantity) : null,
       unit, purchase_price, selling_price, mrp, expiry_date || null,
       manufacturer, description, requires_prescription, low_stock_threshold, is_active,
       req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Medicine not found' });
    res.json({ medicine: result.rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/medicines/:id/stock - update stock
router.patch('/:id/stock', authenticate, async (req, res, next) => {
  try {
    const { adjustment, type } = req.body; // type: 'add' or 'subtract'
    const op = type === 'subtract' ? '-' : '+';

    const result = await pool.query(
      `UPDATE medicines SET stock_quantity = stock_quantity ${op} $1
       WHERE id = $2 AND (stock_quantity ${op} $1) >= 0
       RETURNING *`,
      [parseInt(adjustment), req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Insufficient stock or medicine not found' });
    }
    res.json({ medicine: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
