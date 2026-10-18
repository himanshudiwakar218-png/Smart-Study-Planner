-- ==============================================================================
-- Smart Study Planner — SQLite Database Schema Definition
-- Database file location: data/study-planner.db
-- ==============================================================================

-- Enable SQLite Foreign Key Constraints
PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------------------
-- Table 1: Subjects
-- Stores academic subjects and target study hours
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(1000),
    weekly_target_minutes INTEGER NOT NULL DEFAULT 0,
    target_weekly_hours REAL NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

-- Index for unique subject name lookups and sorting
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_name ON subjects (name);

-- ------------------------------------------------------------------------------
-- Table 2: Study Tasks
-- Stores individual scheduled study tasks and assignments
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    subject_id INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE RESTRICT
);

-- Indexes for frequent query filtering
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON study_tasks (subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON study_tasks (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON study_tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON study_tasks (priority);
