const express = require('express');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// GET /api/patients - list with search & pagination
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE p.is_active = true';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (p.name ILIKE $${params.length} OR p.patient_id ILIKE $${params.length} OR p.mobile ILIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM patients p ${whereClause}`,
      params
    );

    params.push(parseInt(limit), offset);
    const result = await pool.query(
      `SELECT p.*, u.name as registered_by_name
       FROM patients p
       LEFT JOIN users u ON u.id = p.registered_by
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      patients: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/:id - get single patient with full history
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const isPatientId = id.startsWith('PAT');

    const patResult = await pool.query(
      `SELECT p.*, u.name as registered_by_name
       FROM patients p
       LEFT JOIN users u ON u.id = p.registered_by
       WHERE ${isPatientId ? 'p.patient_id' : 'p.id'} = $1`,
      [id]
    );

    if (patResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const patient = patResult.rows[0];

    // Fetch all appointments
    const apptResult = await pool.query(
      `SELECT a.*, u.name as doctor_name, d.specialization
       FROM appointments a
       LEFT JOIN doctors d ON d.id = a.doctor_id
       LEFT JOIN users u ON u.id = d.user_id
       WHERE a.patient_id = $1
       ORDER BY a.created_at DESC`,
      [patient.id]
    );

    // Fetch all consultations
    const consultResult = await pool.query(
      `SELECT c.*, u.name as doctor_name
       FROM consultations c
       LEFT JOIN users u ON u.id = c.consulted_by
       WHERE c.patient_id = $1
       ORDER BY c.created_at DESC`,
      [patient.id]
    );

    // Fetch operations
    const opsResult = await pool.query(
      `SELECT o.*, u.name as doctor_name
       FROM operations o
       LEFT JOIN doctors d ON d.id = o.doctor_id
       LEFT JOIN users u ON u.id = d.user_id
       WHERE o.patient_id = $1
       ORDER BY o.created_at DESC`,
      [patient.id]
    );

    // Fetch bills
    const billsResult = await pool.query(
      `SELECT b.*, 
              json_agg(ms.*) FILTER (WHERE ms.id IS NOT NULL) as items
       FROM bills b
       LEFT JOIN medicine_sales ms ON ms.bill_id = b.id
       WHERE b.patient_id = $1
       GROUP BY b.id
       ORDER BY b.created_at DESC`,
      [patient.id]
    );

    res.json({
      patient,
      appointments: apptResult.rows,
      consultations: consultResult.rows,
      operations: opsResult.rows,
      bills: billsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients - create new patient
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      name, age, gender, mobile, alternate_mobile, email,
      address, village_city, aadhaar_number, blood_group, known_allergies
    } = req.body;

    if (!name || !age || !gender || !mobile) {
      return res.status(400).json({ error: 'Name, age, gender, and mobile are required' });
    }

    const result = await pool.query(
      `INSERT INTO patients (patient_id, name, age, gender, mobile, alternate_mobile, email, address, village_city, aadhaar_number, blood_group, known_allergies, registered_by)
       VALUES ('', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [name, parseInt(age), gender, mobile, alternate_mobile || null, email || null, address, village_city, aadhaar_number || null, blood_group || null, known_allergies || null, req.user.id]
    );

    const patient = result.rows[0];

    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_PATIENT', entityType: 'patient', entityId: patient.id, entityName: patient.name,
      description: `Registered new patient: ${patient.name} (${patient.patient_id})`,
    });

    res.status(201).json({ patient });
  } catch (err) {
    next(err);
  }
});

// PUT /api/patients/:id - update patient
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, age, gender, mobile, alternate_mobile, email,
      address, village_city, aadhaar_number, blood_group, known_allergies
    } = req.body;

    const result = await pool.query(
      `UPDATE patients SET
        name = COALESCE($1, name),
        age = COALESCE($2, age),
        gender = COALESCE($3, gender),
        mobile = COALESCE($4, mobile),
        alternate_mobile = $5,
        email = $6,
        address = COALESCE($7, address),
        village_city = $8,
        aadhaar_number = $9,
        blood_group = $10,
        known_allergies = $11
       WHERE id = $12
       RETURNING *`,
      [name, age ? parseInt(age) : null, gender, mobile, alternate_mobile, email, address, village_city, aadhaar_number, blood_group, known_allergies, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'UPDATE_PATIENT', entityType: 'patient', entityId: id, entityName: name,
      description: `Updated patient record`,
    });

    res.json({ patient: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/search/quick - quick search by mobile/name/id
router.get('/search/quick', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ patients: [] });

    const result = await pool.query(
      `SELECT id, patient_id, name, age, gender, mobile, village_city
       FROM patients
       WHERE is_active = true AND (
         name ILIKE $1 OR patient_id ILIKE $1 OR mobile ILIKE $1
       )
       ORDER BY name
       LIMIT 10`,
      [`%${q}%`]
    );
    res.json({ patients: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
