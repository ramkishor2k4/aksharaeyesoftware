const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');
    const sql = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
