const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../middleware/activityLogger');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get doctor profile if role is doctor
    let doctorProfile = null;
    if (user.role === 'doctor') {
      const docResult = await pool.query(
        'SELECT * FROM doctors WHERE user_id = $1',
        [user.id]
      );
      if (docResult.rows.length > 0) doctorProfile = docResult.rows[0];
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    await logActivity({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN',
      description: `User ${user.name} logged in`,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorProfile,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    let doctorProfile = null;
    if (req.user.role === 'doctor') {
      const docResult = await pool.query(
        'SELECT * FROM doctors WHERE user_id = $1',
        [req.user.id]
      );
      if (docResult.rows.length > 0) doctorProfile = docResult.rows[0];
    }
    res.json({ user: { ...req.user, doctorProfile } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await logActivity({
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    action: 'LOGOUT',
    description: `User ${req.user.name} logged out`,
  });
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/users (admin only - get all users)
router.get('/users', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active, u.created_at,
              d.id as doctor_id, d.specialization, d.consultation_fee
       FROM users u
       LEFT JOIN doctors d ON d.user_id = u.id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/users (admin only - create user)
router.post('/users', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { name, email, password, role, phone, specialization, qualification, registration_number, consultation_fee } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userResult = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone',
      [name, email.toLowerCase(), hash, role, phone]
    );
    const newUser = userResult.rows[0];

    if (role === 'doctor') {
      await pool.query(
        'INSERT INTO doctors (user_id, specialization, qualification, registration_number, consultation_fee) VALUES ($1, $2, $3, $4, $5)',
        [newUser.id, specialization || 'Ophthalmologist', qualification, registration_number, consultation_fee || 300]
      );
    }

    await logActivity({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: 'CREATE_USER', entityType: 'user', entityId: newUser.id, entityName: newUser.name,
      description: `Created user ${newUser.name} with role ${role}`,
    });

    res.status(201).json({ user: newUser });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
