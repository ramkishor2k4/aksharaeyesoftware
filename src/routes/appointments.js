const express = require('express');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// GET /api/appointments - list appointments with filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { date, status, doctor_id, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let where = [];

    const targetDate = date || new Date().toISOString().split('T')[0];
    params.push(targetDate);
    where.push(`a.appointment_date = $${params.length}`);

    if (status) {
      params.push(status);
      where.push(`a.status = $${params.length}`);
    }

    if (doctor_id) {
      params.push(doctor_id);
      where.push(`a.doctor_id = $${params.length}`);
    }

    // Doctors see only their appointments
    if (req.user.role === 'doctor') {
      const docResult = await pool.query('SELECT id FROM doctors WHERE user_id = $1', [req.user.id]);
      if (docResult.rows.length > 0) {
        params.push(docResult.rows[0].id);
        where.push(`a.doctor_id = $${params.length}`);
      }
    }

    const whereStr = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM appointments a ${whereStr}`, params
    );

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT a.*,
              p.name as patient_name, p.patient_id as patient_code, p.age, p.gender, p.mobile,
              u.name as doctor_name, d.specialization,
              EXTRACT(EPOCH FROM (NOW() - a.created_at))/60 as waiting_minutes
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN doctors d ON d.id = a.doctor_id
       LEFT JOIN users u ON u.id = d.user_id
       ${whereStr}
       ORDER BY a.token_number ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      appointments: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id - single appointment
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.*,
              p.name as patient_name, p.patient_id as patient_code, p.age, p.gender, p.mobile, p.address, p.village_city,
              u.name as doctor_name, d.specialization, d.id as doctor_record_id
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN doctors d ON d.id = a.doctor_id
       LEFT JOIN users u ON u.id = d.user_id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Also get consultation if exists
    const consultResult = await pool.query(
      'SELECT * FROM consultations WHERE appointment_id = $1',
      [req.params.id]
    );

    res.json({
      appointment: result.rows[0],
      consultation: consultResult.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/appointments - create appointment
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { patient_id, doctor_id, visit_type, visit_reason, consultation_fee, fee_paid, appointment_date, notes } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient is required' });
    }

    const result = await pool.query(
      `INSERT INTO appointments (patient_id, doctor_id, visit_type, visit_reason, consultation_fee, fee_paid, appointment_date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [patient_id, doctor_id || null, visit_type || 'General', visit_reason || null,
       consultation_fee || 0, fee_paid || false, appointment_date || new Date().toISOString().split('T')[0],
       notes || null, req.user.id]
    );

    const appt = result.rows[0];

    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_APPOINTMENT', entityType: 'appointment', entityId: appt.id,
      description: `Created appointment, token #${appt.token_number}`,
    });

    res.status(201).json({ appointment: appt });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status - update status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['waiting', 'in_consultation', 'completed', 'cancelled', 'sent_to_pharmacy', 'sent_to_ot'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({ appointment: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/appointments/:id - update appointment
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { doctor_id, visit_type, visit_reason, consultation_fee, fee_paid, status, notes } = req.body;

    const result = await pool.query(
      `UPDATE appointments SET
        doctor_id = COALESCE($1, doctor_id),
        visit_type = COALESCE($2, visit_type),
        visit_reason = COALESCE($3, visit_reason),
        consultation_fee = COALESCE($4, consultation_fee),
        fee_paid = COALESCE($5, fee_paid),
        status = COALESCE($6, status),
        notes = $7
       WHERE id = $8 RETURNING *`,
      [doctor_id, visit_type, visit_reason, consultation_fee, fee_paid, status, notes, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/doctors/list - get all doctors for dropdown
router.get('/doctors/list', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT d.id, u.name, d.specialization, d.consultation_fee
       FROM doctors d JOIN users u ON u.id = d.user_id
       WHERE u.is_active = true
       ORDER BY u.name`
    );
    res.json({ doctors: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
