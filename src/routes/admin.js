const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

// GET /api/admin/users — list all system users
router.get('/users', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
              d.specialization, d.qualification
       FROM users u
       LEFT JOIN doctors d ON d.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users — create new user
router.post('/users', async (req, res, next) => {
  try {
    const { name, email, password, role, is_active = true,
            specialization, qualification, consultation_fee = 200 } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }
    const validRoles = ['admin', 'doctor', 'receptionist', 'pharmacist'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check duplicate email
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    const { rows } = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, is_active, created_at`,
      [userId, name, email, hashedPassword, role, is_active]
    );

    // If doctor, create doctors record
    if (role === 'doctor') {
      await pool.query(
        `INSERT INTO doctors (id, user_id, name, specialization, qualification, consultation_fee, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [uuidv4(), userId, name, specialization || 'Ophthalmologist',
         qualification || '', consultation_fee, is_active]
      );
    }

    await logActivity(req, 'CREATE_USER', 'user', userId, name);
    res.status(201).json({ user: rows[0], message: 'User created successfully' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id — update user
router.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, is_active } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let idx = 1;

    if (name)      { updates.push(`name = $${idx++}`);      values.push(name); }
    if (email)     { updates.push(`email = $${idx++}`);     values.push(email); }
    if (role)      { updates.push(`role = $${idx++}`);      values.push(role); }
    if (is_active !== undefined) { updates.push(`is_active = $${idx++}`); values.push(is_active); }
    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 12);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
    }

    updates.push(`updated_at = NOW()`);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, name, email, role, is_active`,
      values
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    // Sync doctor name/status if needed
    if (name || is_active !== undefined) {
      await pool.query(
        `UPDATE doctors SET name = COALESCE($1, name), is_active = COALESCE($2, is_active)
         WHERE user_id = $3`,
        [name || null, is_active ?? null, id]
      );
    }

    await logActivity(req, 'UPDATE_USER', 'user', id, rows[0].name);
    res.json({ user: rows[0], message: 'User updated successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/toggle — toggle active status
router.patch('/users/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const { rows } = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, name, is_active`,
      [is_active, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    // Sync doctor status
    await pool.query(`UPDATE doctors SET is_active = $1 WHERE user_id = $2`, [is_active, id]);

    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
