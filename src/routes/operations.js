const express = require('express');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// GET /api/operations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { date, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const where = [];

    if (date) { params.push(date); where.push(`o.scheduled_date = $${params.length}`); }
    if (status) { params.push(status); where.push(`o.status = $${params.length}`); }

    const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM operations o ${whereStr}`, params);
    params.push(parseInt(limit), offset);

    const result = await pool.query(
      `SELECT o.*, p.name as patient_name, p.patient_id as patient_code, p.age, p.gender,
              u.name as doctor_name, d.specialization
       FROM operations o
       JOIN patients p ON p.id = o.patient_id
       LEFT JOIN doctors d ON d.id = o.doctor_id
       LEFT JOIN users u ON u.id = d.user_id
       ${whereStr}
       ORDER BY o.scheduled_date DESC, o.scheduled_time ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      operations: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// GET /api/operations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT o.*, p.name as patient_name, p.patient_id as patient_code, p.age, p.gender, p.mobile,
              u.name as doctor_name
       FROM operations o
       JOIN patients p ON p.id = o.patient_id
       LEFT JOIN doctors d ON d.id = o.doctor_id
       LEFT JOIN users u ON u.id = d.user_id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Operation not found' });
    res.json({ operation: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/operations
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      patient_id, consultation_id, doctor_id, operation_type, eye,
      assistant_staff, anesthetist, scheduled_date, scheduled_time,
      operation_cost, advance_paid, pre_op_notes
    } = req.body;

    if (!patient_id || !operation_type || !scheduled_date) {
      return res.status(400).json({ error: 'patient_id, operation_type, and scheduled_date are required' });
    }

    const result = await pool.query(
      `INSERT INTO operations (patient_id, consultation_id, doctor_id, operation_type, eye,
        assistant_staff, anesthetist, scheduled_date, scheduled_time,
        operation_cost, advance_paid, pre_op_notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [patient_id, consultation_id || null, doctor_id || null, operation_type, eye || null,
       assistant_staff || null, anesthetist || null, scheduled_date, scheduled_time || null,
       operation_cost || 0, advance_paid || 0, pre_op_notes || null, req.user.id]
    );

    const op = result.rows[0];
    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_OPERATION', entityType: 'operation', entityId: op.id,
      description: `Scheduled operation: ${operation_type} on ${scheduled_date}`,
    });

    res.status(201).json({ operation: op });
  } catch (err) { next(err); }
});

// PUT /api/operations/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const {
      doctor_id, operation_type, eye, assistant_staff, anesthetist,
      scheduled_date, scheduled_time, operation_cost, advance_paid,
      status, pre_op_notes, post_op_notes, complications,
      actual_start_time, actual_end_time
    } = req.body;

    const result = await pool.query(
      `UPDATE operations SET
        doctor_id = COALESCE($1, doctor_id),
        operation_type = COALESCE($2, operation_type),
        eye = $3,
        assistant_staff = $4,
        anesthetist = $5,
        scheduled_date = COALESCE($6, scheduled_date),
        scheduled_time = $7,
        operation_cost = COALESCE($8, operation_cost),
        advance_paid = COALESCE($9, advance_paid),
        status = COALESCE($10, status),
        pre_op_notes = $11,
        post_op_notes = $12,
        complications = $13,
        actual_start_time = $14,
        actual_end_time = $15
       WHERE id = $16 RETURNING *`,
      [doctor_id, operation_type, eye, assistant_staff, anesthetist,
       scheduled_date, scheduled_time, operation_cost, advance_paid,
       status, pre_op_notes, post_op_notes, complications,
       actual_start_time || null, actual_end_time || null,
       req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Operation not found' });
    res.json({ operation: result.rows[0] });
  } catch (err) { next(err); }
});

// PATCH /api/operations/:id/status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const updates = { status };
    if (status === 'in_progress') updates.actual_start_time = new Date().toISOString();
    if (status === 'completed') updates.actual_end_time = new Date().toISOString();

    const result = await pool.query(
      `UPDATE operations SET status = $1,
        actual_start_time = CASE WHEN $1 = 'in_progress' THEN NOW() ELSE actual_start_time END,
        actual_end_time = CASE WHEN $1 = 'completed' THEN NOW() ELSE actual_end_time END
       WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Operation not found' });
    res.json({ operation: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
