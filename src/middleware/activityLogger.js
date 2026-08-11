const { pool } = require('../db/pool');

const activityLogger = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Log after response is formed, don't await to keep it non-blocking
    if (req.logActivity && res.statusCode < 400) {
      const { action, entityType, entityId, entityName, description, metadata } = req.logActivity;
      pool.query(
        `INSERT INTO activity_logs (user_id, user_name, user_role, action, entity_type, entity_id, entity_name, description, ip_address, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::inet, $10)`,
        [
          req.user?.id || null,
          req.user?.name || 'System',
          req.user?.role || 'system',
          action,
          entityType || null,
          entityId || null,
          entityName || null,
          description || null,
          req.ip || null,
          JSON.stringify(metadata || {}),
        ]
      ).catch(err => console.error('Activity log error:', err.message));
    }
    return originalJson(data);
  };

  next();
};

const logActivity = async ({ userId, userName, userRole, action, entityType, entityId, entityName, description, metadata }) => {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, user_name, user_role, action, entity_type, entity_id, entity_name, description, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, userName, userRole, action, entityType, entityId, entityName, description, JSON.stringify(metadata || {})]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

module.exports = { activityLogger, logActivity };
