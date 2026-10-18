-- ==============================================================================
-- Smart Study Planner — PostgreSQL Database Schema Definition
-- Compatible with Neon, Supabase, Vercel Postgres, AWS RDS, and local PostgreSQL.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Table 1: Subjects
-- Stores academic subjects and target study hours
-- ------------------------------------------------------------------------------
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

-- Case-insensitive index for subject name lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_name_lower ON subjects (LOWER(name));

-- ------------------------------------------------------------------------------
-- Table 2: Study Tasks
-- Stores individual scheduled study tasks and assignments
-- ------------------------------------------------------------------------------
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

-- Indexes for frequent query filtering
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON study_tasks (subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON study_tasks (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON study_tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON study_tasks (priority);
