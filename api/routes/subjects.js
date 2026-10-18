/**
 * Subject REST Controller Routes
 * Path prefix: /api/subjects
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { formatSubject, createErrorResponse } = require('../helpers');

// GET /api/subjects
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM subjects ORDER BY id ASC;');
    const subjects = result.rows.map(formatSubject);
    res.json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/subjects/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid subject ID', req.originalUrl));
  }

  try {
    const result = await db.query('SELECT * FROM subjects WHERE id = $1;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(404, 'Not Found', `Subject not found with id: ${id}`, req.originalUrl));
    }
    res.json(formatSubject(result.rows[0]));
  } catch (err) {
    console.error(`Error fetching subject ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// POST /api/subjects
router.post('/', async (req, res) => {
  const { name, description, targetWeeklyHours } = req.body || {};

  const validationErrors = {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    validationErrors.name = 'Subject name is required';
  } else if (name.trim().length > 100) {
    validationErrors.name = 'Subject name cannot exceed 100 characters';
  }

  if (description && description.length > 1000) {
    validationErrors.description = 'Description cannot exceed 1000 characters';
  }

  const hours = targetWeeklyHours != null ? parseFloat(targetWeeklyHours) : 0.0;
  if (isNaN(hours) || hours < 0) {
    validationErrors.targetWeeklyHours = 'Target weekly hours must be non-negative';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Validation failed for one or more fields', req.originalUrl, validationErrors));
  }

  const trimmedName = name.trim();

  try {
    // Check duplicate name (case-insensitive)
    const dupCheck = await db.query('SELECT id FROM subjects WHERE LOWER(name) = LOWER($1);', [trimmedName]);
    if (dupCheck.rows.length > 0) {
      return res.status(409).json(createErrorResponse(409, 'Conflict', `Subject with name '${trimmedName}' already exists`, req.originalUrl));
    }

    const weeklyTargetMinutes = Math.round(hours * 60);

    const insertResult = await db.query(
      `INSERT INTO subjects (name, description, weekly_target_minutes, target_weekly_hours, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *;`,
      [trimmedName, description || null, weeklyTargetMinutes, hours]
    );

    res.status(201).json(formatSubject(insertResult.rows[0]));
  } catch (err) {
    console.error('Error creating subject:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// PUT /api/subjects/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid subject ID', req.originalUrl));
  }

  const { name, description, targetWeeklyHours } = req.body || {};

  const validationErrors = {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    validationErrors.name = 'Subject name is required';
  } else if (name.trim().length > 100) {
    validationErrors.name = 'Subject name cannot exceed 100 characters';
  }

  if (description && description.length > 1000) {
    validationErrors.description = 'Description cannot exceed 1000 characters';
  }

  const hours = targetWeeklyHours != null ? parseFloat(targetWeeklyHours) : 0.0;
  if (isNaN(hours) || hours < 0) {
    validationErrors.targetWeeklyHours = 'Target weekly hours must be non-negative';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Validation failed for one or more fields', req.originalUrl, validationErrors));
  }

  const trimmedName = name.trim();

  try {
    const existing = await db.query('SELECT * FROM subjects WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(createErrorResponse(404, 'Not Found', `Subject not found with id: ${id}`, req.originalUrl));
    }

    // Check duplicate name excluding this ID
    const dupCheck = await db.query('SELECT id FROM subjects WHERE LOWER(name) = LOWER($1) AND id != $2;', [trimmedName, id]);
    if (dupCheck.rows.length > 0) {
      return res.status(409).json(createErrorResponse(409, 'Conflict', `Subject with name '${trimmedName}' already exists`, req.originalUrl));
    }

    const weeklyTargetMinutes = Math.round(hours * 60);

    const updateResult = await db.query(
      `UPDATE subjects
       SET name = $1, description = $2, weekly_target_minutes = $3, target_weekly_hours = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *;`,
      [trimmedName, description || null, weeklyTargetMinutes, hours, id]
    );

    res.json(formatSubject(updateResult.rows[0]));
  } catch (err) {
    console.error(`Error updating subject ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid subject ID', req.originalUrl));
  }

  try {
    const existing = await db.query('SELECT id FROM subjects WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(createErrorResponse(404, 'Not Found', `Subject not found with id: ${id}`, req.originalUrl));
    }

    const taskCountResult = await db.query('SELECT COUNT(*) as count FROM study_tasks WHERE subject_id = $1;', [id]);
    const taskCount = parseInt(taskCountResult.rows[0].count, 10) || 0;

    if (taskCount > 0) {
      return res.status(400).json(
        createErrorResponse(
          400,
          'Bad Request',
          `Cannot delete subject with ID ${id} because ${taskCount} task(s) are still associated with it. Please reassign or delete these tasks first.`,
          req.originalUrl
        )
      );
    }

    await db.query('DELETE FROM subjects WHERE id = $1;', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(`Error deleting subject ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

module.exports = router;
