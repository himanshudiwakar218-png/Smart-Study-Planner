/**
 * Safe SQLite to PostgreSQL Migration Script
 * Migrates existing subjects and study_tasks from data/study-planner.db to PostgreSQL.
 * Safe and non-destructive: will never overwrite existing production records.
 * Usage: npm run db:migrate-sqlite
 */
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getPool, ensureSchema, closePool } = require('../api/db');

function formatTimestamp(val) {
  if (!val) return new Date().toISOString();
  if (typeof val === 'number' || /^\d+$/.test(String(val))) {
    const num = parseInt(val, 10);
    // If milliseconds epoch
    if (num > 10000000000) {
      return new Date(num).toISOString();
    }
    // If seconds epoch
    return new Date(num * 1000).toISOString();
  }
  return new Date(val).toISOString();
}

async function main() {
  console.log('===========================================================');
  console.log(' Smart Study Planner — SQLite to PostgreSQL Data Migrator');
  console.log('===========================================================');

  const dbPath = path.resolve(__dirname, '../data/study-planner.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`ERROR: SQLite database file not found at: ${dbPath}`);
    process.exit(1);
  }

  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL;

  if (!connectionString) {
    console.error('ERROR: No DATABASE_URL or POSTGRES_URL configured.');
    console.error('Please configure your PostgreSQL database connection in .env first.');
    process.exit(1);
  }

  // 1. Extract data from SQLite using Python's built-in sqlite3
  console.log(`[1/3] Reading records from SQLite database (${dbPath})...`);
  let sqliteData;
  try {
    const pyScript = `import sqlite3, json; conn = sqlite3.connect(r'${dbPath}'); conn.row_factory = sqlite3.Row; c = conn.cursor(); subs = [dict(r) for r in c.execute('SELECT * FROM subjects').fetchall()]; tasks = [dict(r) for r in c.execute('SELECT * FROM study_tasks').fetchall()]; print(json.dumps({'subjects': subs, 'tasks': tasks}))`;
    const jsonOutput = execSync(`python -c "${pyScript}"`, { encoding: 'utf-8' });
    sqliteData = JSON.parse(jsonOutput);
  } catch (err) {
    console.error('Failed to read SQLite database via Python. Ensure python is installed:', err.message);
    process.exit(1);
  }

  const { subjects, tasks } = sqliteData;
  console.log(`Found ${subjects.length} subject(s) and ${tasks.length} task(s) in SQLite.`);

  // 2. Connect to PostgreSQL and ensure schema
  console.log('[2/3] Connecting to PostgreSQL and verifying schema...');
  const pool = getPool();
  await ensureSchema();

  // 3. Migrate Subjects
  console.log('[3/3] Migrating records into PostgreSQL...');
  let migratedSubjects = 0;
  let skippedSubjects = 0;

  for (const s of subjects) {
    const trimmedName = String(s.name).trim();
    const existing = await pool.query(
      'SELECT id FROM subjects WHERE id = $1 OR LOWER(name) = LOWER($2);',
      [s.id, trimmedName]
    );

    if (existing.rows.length > 0) {
      console.log(` - Subject [ID: ${s.id}] "${trimmedName}" already exists in PostgreSQL. Skipping.`);
      skippedSubjects++;
      continue;
    }

    const createdAt = formatTimestamp(s.created_at);
    const updatedAt = formatTimestamp(s.updated_at || s.created_at);
    const hours = parseFloat(s.target_weekly_hours != null ? s.target_weekly_hours : 0.0);
    const targetMins = s.weekly_target_minutes != null ? parseInt(s.weekly_target_minutes, 10) : Math.round(hours * 60);

    await pool.query(
      `INSERT INTO subjects (id, name, description, weekly_target_minutes, target_weekly_hours, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [s.id, trimmedName, s.description || '', targetMins, hours, createdAt, updatedAt]
    );
    migratedSubjects++;
    console.log(` + Migrated subject [ID: ${s.id}] "${trimmedName}"`);
  }

  // Update subjects sequence
  await pool.query(`SELECT setval('subjects_id_seq', COALESCE((SELECT MAX(id) FROM subjects), 1));`);

  // 4. Migrate Tasks
  let migratedTasks = 0;
  let skippedTasks = 0;

  for (const t of tasks) {
    const existing = await pool.query('SELECT id FROM study_tasks WHERE id = $1;', [t.id]);
    if (existing.rows.length > 0) {
      console.log(` - Task [ID: ${t.id}] "${t.title}" already exists in PostgreSQL. Skipping.`);
      skippedTasks++;
      continue;
    }

    // Verify foreign key subject exists in Postgres
    const subCheck = await pool.query('SELECT id FROM subjects WHERE id = $1;', [t.subject_id]);
    if (subCheck.rows.length === 0) {
      console.warn(` ! Warning: Subject ID ${t.subject_id} not found for task "${t.title}". Skipping task.`);
      skippedTasks++;
      continue;
    }

    const createdAt = formatTimestamp(t.created_at);
    const updatedAt = formatTimestamp(t.updated_at || t.created_at);
    const completedAt = t.completed_at ? formatTimestamp(t.completed_at) : null;
    const dateStr = String(t.scheduled_date).split('T')[0];
    const timeStr = String(t.start_time);

    await pool.query(
      `INSERT INTO study_tasks (id, title, description, subject_id, scheduled_date, start_time, duration_minutes, priority, status, created_at, updated_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
      [
        t.id,
        t.title,
        t.description || '',
        t.subject_id,
        dateStr,
        timeStr,
        t.duration_minutes,
        t.priority || 'MEDIUM',
        t.status || 'PENDING',
        createdAt,
        updatedAt,
        completedAt
      ]
    );
    migratedTasks++;
    console.log(` + Migrated task [ID: ${t.id}] "${t.title}"`);
  }

  // Update tasks sequence
  await pool.query(`SELECT setval('study_tasks_id_seq', COALESCE((SELECT MAX(id) FROM study_tasks), 1));`);

  await closePool();

  console.log('-----------------------------------------------------------');
  console.log(`Migration Summary:`);
  console.log(`  Subjects: ${migratedSubjects} migrated, ${skippedSubjects} skipped`);
  console.log(`  Tasks:    ${migratedTasks} migrated, ${skippedTasks} skipped`);
  console.log('Data migration completed successfully.');
  console.log('-----------------------------------------------------------');
}

main().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
