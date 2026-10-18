/**
 * Tasks REST Controller Routes
 * Path prefix: /api/tasks
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  formatTask,
  formatDateIso,
  normalizeTime,
  calculateEndTime,
  isOverlapping,
  isTaskOverdue,
  createErrorResponse
} = require('../helpers');

const BASE_TASK_QUERY = `
  SELECT t.*, s.name as subject_name
  FROM study_tasks t
  JOIN subjects s ON t.subject_id = s.id
`;

// GET /api/tasks/today - MUST be before /:id route
router.get('/today', async (req, res) => {
  try {
    const todayIso = formatDateIso(new Date());
    const result = await db.query(
      `${BASE_TASK_QUERY} WHERE t.scheduled_date = $1 ORDER BY t.start_time ASC;`,
      [todayIso]
    );
    res.json(result.rows.map(formatTask));
  } catch (err) {
    console.error('Error fetching today tasks:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/tasks/pending - MUST be before /:id route
router.get('/pending', async (req, res) => {
  try {
    const result = await db.query(
      `${BASE_TASK_QUERY} WHERE t.status = 'PENDING' ORDER BY t.scheduled_date ASC, t.start_time ASC;`
    );
    res.json(result.rows.map(formatTask));
  } catch (err) {
    console.error('Error fetching pending tasks:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/tasks/overdue - MUST be before /:id route
router.get('/overdue', async (req, res) => {
  try {
    const now = new Date();
    const todayIso = formatDateIso(now);
    const currentTimeIso = normalizeTime(`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);

    const result = await db.query(
      `${BASE_TASK_QUERY} WHERE t.status != 'COMPLETED' ORDER BY t.scheduled_date ASC, t.start_time ASC;`
    );

    const overdueTasks = result.rows
      .map(formatTask)
      .filter((task) => isTaskOverdue(task, todayIso, currentTimeIso));

    res.json(overdueTasks);
  } catch (err) {
    console.error('Error fetching overdue tasks:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/tasks - filterable and sortable list
router.get('/', async (req, res) => {
  const {
    subjectId,
    date,
    status,
    priority,
    sortBy = 'date',
    sortDirection = 'asc'
  } = req.query;

  try {
    const conditions = [];
    const params = [];

    if (subjectId) {
      params.push(parseInt(subjectId, 10));
      conditions.push(`t.subject_id = $${params.length}`);
    }

    if (date) {
      params.push(date);
      conditions.push(`t.scheduled_date = $${params.length}`);
    }

    if (status) {
      params.push(status.toUpperCase());
      conditions.push(`t.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority.toUpperCase());
      conditions.push(`t.priority = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const dir = sortDirection.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let orderClause = `ORDER BY t.scheduled_date ${dir}, t.start_time ${dir}`;
    if (sortBy === 'startTime') {
      orderClause = `ORDER BY t.start_time ${dir}`;
    } else if (sortBy === 'title') {
      orderClause = `ORDER BY t.title ${dir}`;
    } else if (sortBy === 'status') {
      orderClause = `ORDER BY t.status ${dir}`;
    } else if (sortBy === 'priority') {
      // High (3), Medium (2), Low (1)
      const pOrder = dir === 'DESC' ? 'DESC' : 'ASC';
      orderClause = `ORDER BY (CASE t.priority WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 1 ELSE 0 END) ${pOrder}, t.scheduled_date ASC`;
    }

    const queryText = `${BASE_TASK_QUERY} ${whereClause} ${orderClause};`;
    const result = await db.query(queryText, params);
    res.json(result.rows.map(formatTask));
  } catch (err) {
    console.error('Error fetching filtered tasks:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid task ID', req.originalUrl));
  }

  try {
    const result = await db.query(`${BASE_TASK_QUERY} WHERE t.id = $1;`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse(404, 'Not Found', `Task not found with id: ${id}`, req.originalUrl));
    }
    res.json(formatTask(result.rows[0]));
  } catch (err) {
    console.error(`Error fetching task ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  const {
    title,
    description,
    subjectId,
    scheduledDate,
    startTime,
    durationMinutes,
    priority = 'MEDIUM',
    status = 'PENDING'
  } = req.body || {};

  const validationErrors = {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    validationErrors.title = 'Task title is required';
  } else if (title.trim().length > 200) {
    validationErrors.title = 'Title cannot exceed 200 characters';
  }

  if (description && description.length > 1000) {
    validationErrors.description = 'Description cannot exceed 1000 characters';
  }

  if (!subjectId) {
    validationErrors.subjectId = 'Subject ID is required';
  }

  if (!scheduledDate) {
    validationErrors.scheduledDate = 'Scheduled date is required';
  }

  if (!startTime) {
    validationErrors.startTime = 'Start time is required';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json(
      createErrorResponse(400, 'Bad Request', 'Validation failed for one or more fields', req.originalUrl, validationErrors)
    );
  }

  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration <= 0) {
    return res.status(400).json(
      createErrorResponse(400, 'Bad Request', 'Task duration must be greater than zero minutes', req.originalUrl)
    );
  }

  const normalizedPriority = ['LOW', 'MEDIUM', 'HIGH'].includes(String(priority).toUpperCase())
    ? String(priority).toUpperCase()
    : 'MEDIUM';

  const normalizedStatus = ['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(String(status).toUpperCase())
    ? String(status).toUpperCase()
    : 'PENDING';

  try {
    // 1. Verify subject exists
    const subjectResult = await db.query('SELECT * FROM subjects WHERE id = $1;', [subjectId]);
    if (subjectResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'Not Found', `Subject not found with id: ${subjectId}`, req.originalUrl)
      );
    }
    const subjectName = subjectResult.rows[0].name;

    // 2. Validate schedule conflict
    const dateStr = formatDateIso(scheduledDate);
    const startStr = normalizeTime(startTime);
    const dayTasks = await db.query(
      'SELECT id, title, start_time, duration_minutes FROM study_tasks WHERE scheduled_date = $1;',
      [dateStr]
    );

    for (const t of dayTasks.rows) {
      const existingStart = normalizeTime(t.start_time);
      const existingDur = parseInt(t.duration_minutes, 10);
      if (isOverlapping(existingStart, existingDur, startStr, duration)) {
        const conflictEnd = calculateEndTime(existingStart, existingDur);
        return res.status(409).json(
          createErrorResponse(
            409,
            'Conflict',
            `Scheduling conflict detected: overlaps with existing task '${t.title}' (${existingStart} to ${conflictEnd}) on ${dateStr}`,
            req.originalUrl
          )
        );
      }
    }

    // 3. Insert task
    const completedAt = normalizedStatus === 'COMPLETED' ? new Date().toISOString() : null;
    const insertResult = await db.query(
      `INSERT INTO study_tasks (title, description, subject_id, scheduled_date, start_time, duration_minutes, priority, status, created_at, updated_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9)
       RETURNING *;`,
      [
        title.trim(),
        description || null,
        subjectId,
        dateStr,
        startStr,
        duration,
        normalizedPriority,
        normalizedStatus,
        completedAt
      ]
    );

    const createdRow = insertResult.rows[0];
    createdRow.subject_name = subjectName;
    res.status(201).json(formatTask(createdRow));
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid task ID', req.originalUrl));
  }

  const {
    title,
    description,
    subjectId,
    scheduledDate,
    startTime,
    durationMinutes,
    priority,
    status
  } = req.body || {};

  const validationErrors = {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    validationErrors.title = 'Task title is required';
  } else if (title.trim().length > 200) {
    validationErrors.title = 'Title cannot exceed 200 characters';
  }

  if (description && description.length > 1000) {
    validationErrors.description = 'Description cannot exceed 1000 characters';
  }

  if (!subjectId) {
    validationErrors.subjectId = 'Subject ID is required';
  }

  if (!scheduledDate) {
    validationErrors.scheduledDate = 'Scheduled date is required';
  }

  if (!startTime) {
    validationErrors.startTime = 'Start time is required';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json(
      createErrorResponse(400, 'Bad Request', 'Validation failed for one or more fields', req.originalUrl, validationErrors)
    );
  }

  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration <= 0) {
    return res.status(400).json(
      createErrorResponse(400, 'Bad Request', 'Task duration must be greater than zero minutes', req.originalUrl)
    );
  }

  try {
    // 1. Check existing task
    const existingResult = await db.query('SELECT * FROM study_tasks WHERE id = $1;', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'Not Found', `Task not found with id: ${id}`, req.originalUrl)
      );
    }
    const existing = existingResult.rows[0];

    // 2. Check subject exists
    const subjectResult = await db.query('SELECT * FROM subjects WHERE id = $1;', [subjectId]);
    if (subjectResult.rows.length === 0) {
      return res.status(404).json(
        createErrorResponse(404, 'Not Found', `Subject not found with id: ${subjectId}`, req.originalUrl)
      );
    }
    const subjectName = subjectResult.rows[0].name;

    // 3. Validate schedule conflict excluding self
    const dateStr = formatDateIso(scheduledDate);
    const startStr = normalizeTime(startTime);
    const dayTasks = await db.query(
      'SELECT id, title, start_time, duration_minutes FROM study_tasks WHERE scheduled_date = $1 AND id != $2;',
      [dateStr, id]
    );

    for (const t of dayTasks.rows) {
      const existingStart = normalizeTime(t.start_time);
      const existingDur = parseInt(t.duration_minutes, 10);
      if (isOverlapping(existingStart, existingDur, startStr, duration)) {
        const conflictEnd = calculateEndTime(existingStart, existingDur);
        return res.status(409).json(
          createErrorResponse(
            409,
            'Conflict',
            `Scheduling conflict detected: overlaps with existing task '${t.title}' (${existingStart} to ${conflictEnd}) on ${dateStr}`,
            req.originalUrl
          )
        );
      }
    }

    const normalizedPriority = priority
      ? String(priority).toUpperCase()
      : existing.priority;

    let newStatus = status ? String(status).toUpperCase() : existing.status;
    let completedAt = existing.completed_at;

    if (newStatus === 'COMPLETED' && existing.status !== 'COMPLETED') {
      completedAt = new Date().toISOString();
    } else if (newStatus !== 'COMPLETED' && existing.status === 'COMPLETED') {
      completedAt = null;
    }

    const updateResult = await db.query(
      `UPDATE study_tasks
       SET title = $1, description = $2, subject_id = $3, scheduled_date = $4, start_time = $5,
           duration_minutes = $6, priority = $7, status = $8, updated_at = NOW(), completed_at = $9
       WHERE id = $10
       RETURNING *;`,
      [
        title.trim(),
        description || null,
        subjectId,
        dateStr,
        startStr,
        duration,
        normalizedPriority,
        newStatus,
        completedAt,
        id
      ]
    );

    const updatedRow = updateResult.rows[0];
    updatedRow.subject_name = subjectName;
    res.json(formatTask(updatedRow));
  } catch (err) {
    console.error(`Error updating task ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid task ID', req.originalUrl));
  }

  try {
    const existing = await db.query('SELECT id FROM study_tasks WHERE id = $1;', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(createErrorResponse(404, 'Not Found', `Task not found with id: ${id}`, req.originalUrl));
    }

    await db.query('DELETE FROM study_tasks WHERE id = $1;', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(`Error deleting task ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid task ID', req.originalUrl));
  }

  try {
    const existing = await db.query(`${BASE_TASK_QUERY} WHERE t.id = $1;`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(createErrorResponse(404, 'Not Found', `Task not found with id: ${id}`, req.originalUrl));
    }

    const updateResult = await db.query(
      `UPDATE study_tasks
       SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id]
    );

    const updatedRow = updateResult.rows[0];
    updatedRow.subject_name = existing.rows[0].subject_name;
    res.json(formatTask(updatedRow));
  } catch (err) {
    console.error(`Error completing task ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// PATCH /api/tasks/:id/reopen
router.patch('/:id/reopen', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json(createErrorResponse(400, 'Bad Request', 'Invalid task ID', req.originalUrl));
  }

  try {
    const existing = await db.query(`${BASE_TASK_QUERY} WHERE t.id = $1;`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json(createErrorResponse(404, 'Not Found', `Task not found with id: ${id}`, req.originalUrl));
    }

    const updateResult = await db.query(
      `UPDATE study_tasks
       SET status = 'PENDING', completed_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id]
    );

    const updatedRow = updateResult.rows[0];
    updatedRow.subject_name = existing.rows[0].subject_name;
    res.json(formatTask(updatedRow));
  } catch (err) {
    console.error(`Error reopening task ${id}:`, err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

module.exports = router;
