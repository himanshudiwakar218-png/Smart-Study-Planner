/**
 * Standalone Database Initialization Script
 * Safely creates tables and indexes in the configured PostgreSQL database.
 * Usage: npm run db:init
 */
require('dotenv').config();
const { getPool, ensureSchema, closePool } = require('../api/db');

async function main() {
  console.log('[db:init] Starting PostgreSQL schema verification and creation...');

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    console.error('ERROR: No DATABASE_URL or POSTGRES_URL environment variable found.');
    console.error('Please configure your database connection string in .env first.');
    process.exit(1);
  }

  // Mask credentials for safe logging
  const maskedUrl = connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  console.log(`[db:init] Connecting to: ${maskedUrl}`);

  try {
    const pool = getPool();
    // Test connection
    const testResult = await pool.query('SELECT NOW() as current_time, current_database() as db_name;');
    console.log(`[db:init] Connected successfully to database "${testResult.rows[0].db_name}" at ${testResult.rows[0].current_time}`);

    await ensureSchema();
    console.log('[db:init] PostgreSQL schema (subjects, study_tasks, indexes) is active and ready.');
  } catch (err) {
    console.error('[db:init] Schema initialization failed:', err);
    process.exit(1);
  } finally {
    await closePool();
    console.log('[db:init] Completed.');
  }
}

main();
