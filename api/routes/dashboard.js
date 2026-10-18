/**
 * Dashboard REST Controller Routes
 * Path prefix: /api/dashboard
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  formatTask,
  formatDateIso,
  normalizeTime,
  isTaskOverdue,
  calculatePercentage,
  getMondayOfWeek,
  createErrorResponse
} = require('../helpers');

const BASE_TASK_QUERY = `
  SELECT t.*, s.name as subject_name
  FROM study_tasks t
  JOIN subjects s ON t.subject_id = s.id
`;

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const subjectsCountResult = await db.query('SELECT COUNT(*) as count FROM subjects;');
    const totalSubjects = parseInt(subjectsCountResult.rows[0].count, 10) || 0;

    const tasksResult = await db.query(`${BASE_TASK_QUERY};`);
    const allTasks = tasksResult.rows.map(formatTask);

    const now = new Date();
    const todayIso = formatDateIso(now);
    const currentTimeIso = normalizeTime(`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);

    let pendingTasks = 0;
    let inProgressTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;
    let todayScheduledTasks = 0;
    let todayCompletedTasks = 0;
    let totalScheduledMinutes = 0;
    let completedStudyMinutes = 0;

    for (const task of allTasks) {
      const dur = task.durationMinutes || 0;
      totalScheduledMinutes += dur;

      if (task.status === 'PENDING') {
        pendingTasks++;
      } else if (task.status === 'IN_PROGRESS') {
        inProgressTasks++;
      } else if (task.status === 'COMPLETED') {
        completedTasks++;
        completedStudyMinutes += dur;
      }

      if (isTaskOverdue(task, todayIso, currentTimeIso)) {
        overdueTasks++;
      }

      if (task.scheduledDate === todayIso) {
        todayScheduledTasks++;
        if (task.status === 'COMPLETED') {
          todayCompletedTasks++;
        }
      }
    }

    const overallCompletionPercentage = calculatePercentage(completedTasks, allTasks.length);

    res.json({
      totalSubjects,
      totalTasks: allTasks.length,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      todayScheduledTasks,
      todayCompletedTasks,
      totalScheduledMinutes,
      completedStudyMinutes,
      overallCompletionPercentage
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/dashboard/subjects
router.get('/subjects', async (req, res) => {
  try {
    const subjectsResult = await db.query('SELECT * FROM subjects ORDER BY id ASC;');
    const tasksResult = await db.query(`${BASE_TASK_QUERY};`);

    const allTasks = tasksResult.rows.map(formatTask);
    const tasksBySubject = new Map();

    for (const task of allTasks) {
      if (!tasksBySubject.has(task.subjectId)) {
        tasksBySubject.set(task.subjectId, []);
      }
      tasksBySubject.get(task.subjectId).push(task);
    }

    const progressList = subjectsResult.rows.map((subj) => {
      const subId = parseInt(subj.id, 10);
      const subTasks = tasksBySubject.get(subId) || [];

      let completedTasks = 0;
      let pendingTasks = 0;
      let inProgressTasks = 0;
      let totalScheduledMinutes = 0;
      let completedMinutes = 0;

      for (const t of subTasks) {
        const dur = t.durationMinutes || 0;
        totalScheduledMinutes += dur;

        if (t.status === 'COMPLETED') {
          completedTasks++;
          completedMinutes += dur;
        } else if (t.status === 'IN_PROGRESS') {
          inProgressTasks++;
        } else {
          pendingTasks++;
        }
      }

      const completionPercentage = calculatePercentage(completedTasks, subTasks.length);

      return {
        subjectId: subId,
        subjectName: subj.name,
        targetWeeklyHours: parseFloat(subj.target_weekly_hours != null ? subj.target_weekly_hours : 0.0),
        totalTasks: subTasks.length,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        completionPercentage,
        totalScheduledMinutes,
        completedMinutes
      };
    });

    res.json(progressList);
  } catch (err) {
    console.error('Error fetching dashboard subjects:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// Helper for daily summary
async function getDailySummaryData(dateStr) {
  const result = await db.query(
    `${BASE_TASK_QUERY} WHERE t.scheduled_date = $1 ORDER BY t.start_time ASC;`,
    [dateStr]
  );
  const tasks = result.rows.map(formatTask);

  let completedTasks = 0;
  let pendingTasks = 0;
  let inProgressTasks = 0;
  let totalScheduledMinutes = 0;
  let completedMinutes = 0;

  for (const t of tasks) {
    const dur = t.durationMinutes || 0;
    totalScheduledMinutes += dur;
    if (t.status === 'COMPLETED') {
      completedTasks++;
      completedMinutes += dur;
    } else if (t.status === 'IN_PROGRESS') {
      inProgressTasks++;
    } else {
      pendingTasks++;
    }
  }

  const completionPercentage = calculatePercentage(completedTasks, tasks.length);

  return {
    date: dateStr,
    totalTasks: tasks.length,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    totalScheduledMinutes,
    completedMinutes,
    completionPercentage,
    tasks
  };
}

// GET /api/dashboard/daily?date=
router.get('/daily', async (req, res) => {
  try {
    const dateStr = req.query.date ? formatDateIso(req.query.date) : formatDateIso(new Date());
    const dailyData = await getDailySummaryData(dateStr);
    res.json(dailyData);
  } catch (err) {
    console.error('Error fetching dashboard daily summary:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

// GET /api/dashboard/weekly?startDate=
router.get('/weekly', async (req, res) => {
  try {
    const startDateStr = req.query.startDate ? formatDateIso(req.query.startDate) : getMondayOfWeek();
    const startObj = new Date(startDateStr + 'T00:00:00');

    const dailyBreakdown = [];
    let totalTasks = 0;
    let completedTasks = 0;
    let totalScheduledMinutes = 0;
    let completedMinutes = 0;

    for (let i = 0; i < 7; i++) {
      const current = new Date(startObj);
      current.setDate(startObj.getDate() + i);
      const currentIso = formatDateIso(current);

      const daySummary = await getDailySummaryData(currentIso);
      dailyBreakdown.push(daySummary);

      totalTasks += daySummary.totalTasks;
      completedTasks += daySummary.completedTasks;
      totalScheduledMinutes += daySummary.totalScheduledMinutes;
      completedMinutes += daySummary.completedMinutes;
    }

    const endObj = new Date(startObj);
    endObj.setDate(startObj.getDate() + 6);
    const endDateStr = formatDateIso(endObj);

    const completionPercentage = calculatePercentage(completedTasks, totalTasks);

    // Subject breakdown for the 7-day week
    const subjectsResult = await db.query('SELECT * FROM subjects ORDER BY id ASC;');
    const weekTasksResult = await db.query(
      `${BASE_TASK_QUERY} WHERE t.scheduled_date >= $1 AND t.scheduled_date <= $2 ORDER BY t.scheduled_date ASC, t.start_time ASC;`,
      [startDateStr, endDateStr]
    );

    const weekTasks = weekTasksResult.rows.map(formatTask);
    const weekTasksBySub = new Map();
    for (const t of weekTasks) {
      if (!weekTasksBySub.has(t.subjectId)) {
        weekTasksBySub.set(t.subjectId, []);
      }
      weekTasksBySub.get(t.subjectId).push(t);
    }

    const subjectBreakdown = subjectsResult.rows.map((subj) => {
      const subId = parseInt(subj.id, 10);
      const subTasks = weekTasksBySub.get(subId) || [];

      let compSubTasks = 0;
      let pendSubTasks = 0;
      let inProgSubTasks = 0;
      let subTotalMin = 0;
      let subCompMin = 0;

      for (const t of subTasks) {
        const dur = t.durationMinutes || 0;
        subTotalMin += dur;
        if (t.status === 'COMPLETED') {
          compSubTasks++;
          subCompMin += dur;
        } else if (t.status === 'IN_PROGRESS') {
          inProgSubTasks++;
        } else {
          pendSubTasks++;
        }
      }

      const subPercentage = calculatePercentage(compSubTasks, subTasks.length);

      return {
        subjectId: subId,
        subjectName: subj.name,
        targetWeeklyHours: parseFloat(subj.target_weekly_hours != null ? subj.target_weekly_hours : 0.0),
        totalTasks: subTasks.length,
        completedTasks: compSubTasks,
        pendingTasks: pendSubTasks,
        inProgressTasks: inProgSubTasks,
        completionPercentage: subPercentage,
        totalScheduledMinutes: subTotalMin,
        completedMinutes: subCompMin
      };
    });

    res.json({
      startDate: startDateStr,
      endDate: endDateStr,
      totalTasks,
      completedTasks,
      totalScheduledMinutes,
      completedMinutes,
      completionPercentage,
      dailyBreakdown,
      subjectBreakdown
    });
  } catch (err) {
    console.error('Error fetching weekly summary:', err);
    res.status(500).json(createErrorResponse(500, 'Internal Server Error', err.message, req.originalUrl));
  }
});

module.exports = router;
