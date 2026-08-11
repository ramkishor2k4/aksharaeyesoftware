/**
 * Creates the database if it doesn't exist, then runs migrations.
 * Run: node src/db/createAndMigrate.js
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};
const dbName = process.env.DB_NAME || 'akshara_eye_hospital';

async function createDb() {
  const client = new Client({ ...config, database: 'postgres' });
  await client.connect();
  try {
    const exists = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
    );
    if (exists.rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created.`);
    } else {
      console.log(`ℹ️  Database "${dbName}" already exists.`);
    }
  } finally {
    await client.end();
  }
}

async function migrate() {
  const client = new Client({ ...config, database: dbName });
  await client.connect();
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'migrations.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Migrations completed successfully!');
  } finally {
    await client.end();
  }
}

(async () => {
  try {
    await createDb();
    await migrate();
    console.log('\n🎉 Database is ready! Now run: npm run seed');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
