/**
 * Schedule REST Controller Routes
 * Path prefix: /api/schedule
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  formatTask,
  formatDateIso,
  normalizeTime,
  isOverlapping,
  getMondayOfWeek,
  createErrorResponse
} = require('../helpers');

const BASE_TASK_QUERY = `
  SELECT t.*, s.name as subject_name
  FROM study_tasks t
  JOIN subjects s ON t.subject_id = s.id
`;

/**
 * Helper to fetch day schedule details for a specific date string (YYYY-MM-DD)
 */
async function getDayScheduleData(dateStr) {
  const result = await db.query(
    `${BASE_TASK_QUERY} WHERE t.scheduled_date = $1 ORDER BY t.start_time ASC;`,
    [dateStr]
  );

  const tasks = result.rows.map(formatTask);
  let totalMinutes = 0;
  let completedMinutes = 0;
  const subjectMinutes = {};

  for (const task of tasks) {
    const dur = task.durationMinutes || 0;
    totalMinutes += dur;
    if (task.status === 'COMPLETED') {
      completedMinutes += dur;
    }
    const subName = task.subjectName || 'Unknown';
    subjectMinutes[subName] = (subjectMinutes[subName] || 0) + dur;
  }

  return {
    date: dateStr,
    totalTasks: tasks.length,
    totalMinutes,
    completedMinutes,
    tasks,
    subjectMinutes
  };
}

// GET /api/schedule/day?date=
router.get('/day', async (req, res) => {
  try {
    const dateStr = req.query.date ? formatDateIso(req.query.date) : formatDateIso(new Date());
    const daySchedule = await getDayScheduleData(dateStr);
    res.json(daySchedule);
  } catch (err) {
    console.error('Error fetching day schedule:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/schedule/week?startDate=
router.get('/week', async (req, res) => {
  try {
    const startDateStr = req.query.startDate ? formatDateIso(req.query.startDate) : getMondayOfWeek();
    const startObj = new Date(startDateStr + 'T00:00:00');

    const days = [];
    const weeklySubjectMinutes = {};
    let totalWeekTasks = 0;
    let totalWeekMinutes = 0;
    let completedWeekMinutes = 0;

    for (let i = 0; i < 7; i++) {
      const current = new Date(startObj);
      current.setDate(startObj.getDate() + i);
      const currentIso = formatDateIso(current);

      const dayData = await getDayScheduleData(currentIso);
      days.push(dayData);

      totalWeekTasks += dayData.totalTasks;
      totalWeekMinutes += dayData.totalMinutes;
      completedWeekMinutes += dayData.completedMinutes;

      for (const [subName, mins] of Object.entries(dayData.subjectMinutes)) {
        weeklySubjectMinutes[subName] = (weeklySubjectMinutes[subName] || 0) + mins;
      }
    }

    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + 6);
    const endDateStr = formatDateIso(endObj);

    res.json({
      startDate: startDateStr,
      endDate: endDateStr,
      totalWeekTasks,
      totalWeekMinutes,
      completedWeekMinutes,
      days,
      subjectMinutes: weeklySubjectMinutes
    });
  } catch (err) {
    console.error('Error fetching week schedule:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// POST /api/schedule/validate
router.post('/validate', async (req, res) => {
  const { scheduledDate, startTime, durationMinutes, excludeTaskId } = req.body || {};

  const validationErrors = {};
  if (!scheduledDate) validationErrors.scheduledDate = 'Scheduled date is required';
  if (!startTime) validationErrors.startTime = 'Start time is required';
  const duration = parseInt(durationMinutes, 10);
  if (isNaN(duration) || duration <= 0) {
    validationErrors.durationMinutes = 'Duration must be greater than zero minutes';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json(
      createErrorResponse(400, 'Bad Request', 'Validation failed for one or more fields', req.originalUrl, validationErrors)
    );
  }

  try {
    const dateStr = formatDateIso(scheduledDate);
    const startStr = normalizeTime(startTime);
    const excludeId = excludeTaskId ? parseInt(excludeTaskId, 10) : null;

    const result = await db.query(
      `${BASE_TASK_QUERY} WHERE t.scheduled_date = $1 ORDER BY t.start_time ASC;`,
      [dateStr]
    );

    const conflicts = [];
    for (const row of result.rows) {
      if (excludeId != null && parseInt(row.id, 10) === excludeId) {
        continue;
      }
      const existingStart = normalizeTime(row.start_time);
      const existingDur = parseInt(row.duration_minutes, 10);
      if (isOverlapping(existingStart, existingDur, startStr, duration)) {
        conflicts.push(formatTask(row));
      }
    }

    if (conflicts.length === 0) {
      return res.json({
        valid: true,
        message: 'No schedule conflicts detected. Time slot is available.',
        conflicts: []
      });
    }

    return res.json({
      valid: false,
      message: `Found ${conflicts.length} conflicting task(s) for the proposed time slot.`,
      conflicts
    });
  } catch (err) {
    console.error('Error validating schedule:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

module.exports = router;
