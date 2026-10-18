/**
 * PostgreSQL Database Connection Pool & Safe Schema Initializer
 * Compatible with Neon, Supabase, Vercel Postgres, and standard PostgreSQL.
 */
const { Pool, types } = require('pg');
require('dotenv').config();

// Ensure DATE and TIME columns are returned as exact strings (prevent UTC date shifting)
types.setTypeParser(1082, (val) => val); // DATE -> 'YYYY-MM-DD'
types.setTypeParser(1083, (val) => val); // TIME -> 'HH:MM:SS'
types.setTypeParser(1114, (val) => val); // TIMESTAMP -> 'YYYY-MM-DD HH:MM:SS'

let pool = null;
let isSchemaInitialized = false;
let schemaInitPromise = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS subjects (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    weekly_target_minutes INTEGER NOT NULL DEFAULT 0,
    target_weekly_hours DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_subjects_name UNIQUE (name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_name_lower ON subjects (LOWER(name));

CREATE TABLE IF NOT EXISTS study_tasks (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    subject_id BIGINT NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_tasks_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON study_tasks (subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON study_tasks (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON study_tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON study_tasks (priority);
`;

/**
 * Initializes or returns the connection pool.
 */
function getPool() {
  if (pool) return pool;

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    // If running in test or offline development mode without DATABASE_URL, instantiate pg-mem
    if (process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL) {
      try {
        const { newDb } = require('pg-mem');
        const memDb = newDb();
        const memPg = memDb.adapters.createPg();
        pool = new memPg.Pool();
        return pool;
      } catch (err) {
        console.warn('[Database] DATABASE_URL not set and pg-mem could not be initialized.');
      }
    }

    throw new Error(
      'DATABASE_URL environment variable is not defined. Please set DATABASE_URL (or POSTGRES_URL) in your environment or .env file.'
    );
  }

  const isLocalhost =
    connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

  pool = new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err);
  });

  return pool;
}

/**
 * Ensures required database schema exists without deleting or modifying existing user data.
 */
async function ensureSchema() {
  if (isSchemaInitialized) return;
  if (schemaInitPromise) return schemaInitPromise;

  schemaInitPromise = (async () => {
    const activePool = getPool();
    await activePool.query(SCHEMA_SQL);
    isSchemaInitialized = true;
    schemaInitPromise = null;
  })();

  return schemaInitPromise;
}

/**
 * Helper to execute parameterized queries safely with automatic schema initialization.
 */
async function query(text, params) {
  await ensureSchema();
  const activePool = getPool();
  return activePool.query(text, params);
}

/**
 * Closes the pool (useful during testing cleanup).
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    isSchemaInitialized = false;
    schemaInitPromise = null;
  }
}

module.exports = {
  getPool,
  ensureSchema,
  query,
  closePool,
  SCHEMA_SQL
};
