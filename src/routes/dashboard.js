const express = require('express');
const { pool } = require('../db/pool');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats - daily stats
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [
      patientsResult,
      opResult,
      otResult,
      revenueResult,
      queueResult,
    ] = await Promise.all([
      // Today's new patients
      pool.query(`SELECT COUNT(*) FROM patients WHERE DATE(created_at) = $1`, [today]),

      // Today's OP consultations
      pool.query(`SELECT COUNT(*) FROM appointments WHERE appointment_date = $1`, [today]),

      // Today's OT stats
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM operations 
        WHERE scheduled_date = $1
      `, [today]),

      // Today's revenue
      pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN bill_type = 'op' THEN total_amount ELSE 0 END), 0) as op_revenue,
          COALESCE(SUM(CASE WHEN bill_type = 'ot' THEN total_amount ELSE 0 END), 0) as ot_revenue,
          COALESCE(SUM(CASE WHEN bill_type = 'pharmacy' THEN total_amount ELSE 0 END), 0) as pharmacy_revenue,
          COALESCE(SUM(total_amount), 0) as total_revenue
        FROM bills
        WHERE DATE(created_at) = $1 AND payment_status != 'pending'
      `, [today]),

      // Live waiting queue
      pool.query(`
        SELECT a.id, a.token_number, a.status, a.appointment_time,
               p.name as patient_name, p.patient_id as patient_code, p.age, p.gender,
               u.name as doctor_name,
               EXTRACT(EPOCH FROM (NOW() - a.created_at))/60 as waiting_minutes
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN doctors d ON d.id = a.doctor_id
        LEFT JOIN users u ON u.id = d.user_id
        WHERE a.appointment_date = $1
          AND a.status IN ('waiting', 'in_consultation')
        ORDER BY a.token_number ASC
        LIMIT 20
      `, [today]),
    ]);

    const otStats = otResult.rows[0];
    const revenue = revenueResult.rows[0];

    res.json({
      stats: {
        newPatients: parseInt(patientsResult.rows[0].count),
        opConsultations: parseInt(opResult.rows[0].count),
        otScheduled: parseInt(otStats.scheduled),
        otCompleted: parseInt(otStats.completed),
        revenue: {
          op: parseFloat(revenue.op_revenue),
          ot: parseFloat(revenue.ot_revenue),
          pharmacy: parseFloat(revenue.pharmacy_revenue),
          total: parseFloat(revenue.total_revenue),
        },
      },
      waitingQueue: queueResult.rows,
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/weekly-revenue - last 7 days revenue for chart
router.get('/weekly-revenue', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(CASE WHEN bill_type = 'op' THEN total_amount ELSE 0 END), 0) as op_revenue,
        COALESCE(SUM(CASE WHEN bill_type = 'ot' THEN total_amount ELSE 0 END), 0) as ot_revenue,
        COALESCE(SUM(CASE WHEN bill_type = 'pharmacy' THEN total_amount ELSE 0 END), 0) as pharmacy_revenue,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM bills
      WHERE created_at >= NOW() - INTERVAL '7 days'
        AND payment_status != 'pending'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json({ weeklyRevenue: result.rows });
  } catch (err) { next(err); }
});

// GET /api/dashboard/reports/daily
router.get('/reports/daily', authenticate, async (req, res, next) => {
  try {
    const { date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM patients WHERE DATE(created_at) = $1) as new_patients,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = $1) as total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = $1 AND status = 'completed') as completed_appointments,
        (SELECT COUNT(*) FROM operations WHERE scheduled_date = $1) as total_operations,
        (SELECT COUNT(*) FROM operations WHERE scheduled_date = $1 AND status = 'completed') as completed_operations,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE DATE(created_at) = $1 AND bill_type = 'op') as op_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE DATE(created_at) = $1 AND bill_type = 'ot') as ot_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE DATE(created_at) = $1 AND bill_type = 'pharmacy') as pharmacy_revenue,
        (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE DATE(created_at) = $1) as total_revenue
    `, [reportDate]);

    res.json({ report: result.rows[0], date: reportDate });
  } catch (err) { next(err); }
});

// GET /api/dashboard/reports/monthly
router.get('/reports/monthly', authenticate, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month || (now.getMonth() + 1);
    const y = year || now.getFullYear();

    const result = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE bill_type = 'op') as op_count,
        COUNT(*) FILTER (WHERE bill_type = 'pharmacy') as pharmacy_count,
        COALESCE(SUM(CASE WHEN bill_type = 'op' THEN total_amount ELSE 0 END), 0) as op_revenue,
        COALESCE(SUM(CASE WHEN bill_type = 'ot' THEN total_amount ELSE 0 END), 0) as ot_revenue,
        COALESCE(SUM(CASE WHEN bill_type = 'pharmacy' THEN total_amount ELSE 0 END), 0) as pharmacy_revenue,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM bills
      WHERE EXTRACT(MONTH FROM created_at) = $1
        AND EXTRACT(YEAR FROM created_at) = $2
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `, [m, y]);

    res.json({ monthlyData: result.rows, month: m, year: y });
  } catch (err) { next(err); }
});

// GET /api/dashboard/activity-logs
router.get('/activity-logs', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );
    const countResult = await pool.query('SELECT COUNT(*) FROM activity_logs');

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (err) { next(err); }
});

module.exports = router;
