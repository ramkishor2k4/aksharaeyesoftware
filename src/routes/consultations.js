const express = require('express');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// GET /api/consultations/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as doctor_name,
              p.name as patient_name, p.patient_id as patient_code
       FROM consultations c
       LEFT JOIN users u ON u.id = c.consulted_by
       LEFT JOIN patients p ON p.id = c.patient_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Consultation not found' });
    res.json({ consultation: result.rows[0] });
  } catch (err) { next(err); }
});

// GET /api/consultations/by-appointment/:appointmentId
router.get('/by-appointment/:appointmentId', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as doctor_name
       FROM consultations c
       LEFT JOIN users u ON u.id = c.consulted_by
       WHERE c.appointment_id = $1`,
      [req.params.appointmentId]
    );
    res.json({ consultation: result.rows[0] || null });
  } catch (err) { next(err); }
});

// POST /api/consultations - create consultation
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      appointment_id, patient_id, doctor_id,
      right_eye_vision, left_eye_vision, right_eye_power, left_eye_power,
      right_eye_pressure, left_eye_pressure,
      chief_complaint, diagnosis, clinical_notes,
      prescribed_medicines, investigations,
      follow_up_date, follow_up_notes,
      send_to_pharmacy, send_to_ot, ot_recommendation,
    } = req.body;

    if (!appointment_id || !patient_id) {
      return res.status(400).json({ error: 'appointment_id and patient_id are required' });
    }

    // Upsert consultation
    const existing = await pool.query(
      'SELECT id FROM consultations WHERE appointment_id = $1',
      [appointment_id]
    );

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(
        `UPDATE consultations SET
          doctor_id = $1, right_eye_vision = $2, left_eye_vision = $3,
          right_eye_power = $4, left_eye_power = $5,
          right_eye_pressure = $6, left_eye_pressure = $7,
          chief_complaint = $8, diagnosis = $9, clinical_notes = $10,
          prescribed_medicines = $11, investigations = $12,
          follow_up_date = $13, follow_up_notes = $14,
          send_to_pharmacy = $15, send_to_ot = $16, ot_recommendation = $17,
          consulted_by = $18
         WHERE appointment_id = $19 RETURNING *`,
        [
          doctor_id, right_eye_vision, left_eye_vision,
          right_eye_power, left_eye_power,
          right_eye_pressure, left_eye_pressure,
          chief_complaint, diagnosis, clinical_notes,
          JSON.stringify(prescribed_medicines || []), investigations,
          follow_up_date || null, follow_up_notes,
          send_to_pharmacy || false, send_to_ot || false, ot_recommendation,
          req.user.id, appointment_id
        ]
      );
    } else {
      result = await pool.query(
        `INSERT INTO consultations (
          appointment_id, patient_id, doctor_id,
          right_eye_vision, left_eye_vision, right_eye_power, left_eye_power,
          right_eye_pressure, left_eye_pressure,
          chief_complaint, diagnosis, clinical_notes,
          prescribed_medicines, investigations,
          follow_up_date, follow_up_notes,
          send_to_pharmacy, send_to_ot, ot_recommendation,
          consulted_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        RETURNING *`,
        [
          appointment_id, patient_id, doctor_id,
          right_eye_vision, left_eye_vision, right_eye_power, left_eye_power,
          right_eye_pressure, left_eye_pressure,
          chief_complaint, diagnosis, clinical_notes,
          JSON.stringify(prescribed_medicines || []), investigations,
          follow_up_date || null, follow_up_notes,
          send_to_pharmacy || false, send_to_ot || false, ot_recommendation,
          req.user.id
        ]
      );
    }

    // Update appointment status
    let newStatus = 'completed';
    if (send_to_pharmacy) newStatus = 'sent_to_pharmacy';
    if (send_to_ot) newStatus = 'sent_to_ot';

    await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [newStatus, appointment_id]);

    const consultation = result.rows[0];
    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'SAVE_CONSULTATION', entityType: 'consultation', entityId: consultation.id,
      description: `Saved consultation for appointment ${appointment_id}`,
    });

    res.status(201).json({ consultation });
  } catch (err) { next(err); }
});

module.exports = router;
