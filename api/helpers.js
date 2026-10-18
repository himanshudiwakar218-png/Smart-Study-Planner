/**
 * Smart Study Planner — Utility Functions & Response Formatters
 * Mirroring Java backend business logic, time math, and DTO contracts.
 */

/**
 * Converts a time string (HH:mm or HH:mm:ss) to total minutes from midnight.
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight into 'HH:mm:ss'.
 */
function minutesToTime(totalMinutes) {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(mins)}:00`;
}

/**
 * Normalizes any time input (e.g. '09:00', '9:00', '09:00:00') to standard 'HH:mm:ss'.
 */
function normalizeTime(timeStr) {
  if (!timeStr) return '00:00:00';
  const parts = String(timeStr).trim().split(':');
  const pad = (n) => String(parseInt(n, 10) || 0).padStart(2, '0');
  const hh = pad(parts[0]);
  const mm = pad(parts[1] || '0');
  const ss = pad(parts[2] || '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Calculates end time by adding duration minutes to start time.
 */
function calculateEndTime(startTime, durationMinutes) {
  if (!startTime || !durationMinutes) return null;
  const startMins = timeToMinutes(startTime);
  const endMins = startMins + parseInt(durationMinutes, 10);
  return minutesToTime(endMins);
}

/**
 * Determines whether two study time intervals overlap.
 * Adjacent intervals (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 * [start1, end1) and [start2, end2) overlap if start1 < end2 and start2 < end1.
 */
function isOverlapping(start1, duration1, start2, duration2) {
  if (!start1 || !start2 || duration1 <= 0 || duration2 <= 0) {
    return false;
  }
  const s1 = timeToMinutes(start1);
  const e1 = s1 + parseInt(duration1, 10);
  const s2 = timeToMinutes(start2);
  const e2 = s2 + parseInt(duration2, 10);

  return s1 < e2 && s2 < e1;
}

/**
 * Formats a Date object or string as 'YYYY-MM-DD'.
 */
function formatDateIso(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0];
  }
  const d = new Date(dateInput);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Returns the Monday of the week for a given date.
 */
function getMondayOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  date.setDate(diff);
  return formatDateIso(date);
}

/**
 * Determines whether a study task is overdue based on date and time.
 * Overdue if:
 * 1. Status is not COMPLETED
 * 2. Scheduled date is before today OR (date is today AND session end time has passed)
 */
function isTaskOverdue(task, todayIso, currentTimeIso) {
  if (task.status === 'COMPLETED') return false;
  const scheduledDate = task.scheduledDate || (task.scheduled_date ? formatDateIso(task.scheduled_date) : null);
  if (!scheduledDate) return false;

  if (scheduledDate < todayIso) return true;
  if (scheduledDate === todayIso) {
    const endTime = task.endTime || calculateEndTime(task.startTime || task.start_time, task.durationMinutes || task.duration_minutes);
    return endTime != null && endTime < currentTimeIso;
  }
  return false;
}

/**
 * Formats a database subject row into a SubjectResponse object.
 */
function formatSubject(row) {
  if (!row) return null;
  return {
    id: parseInt(row.id, 10),
    name: row.name,
    description: row.description || '',
    targetWeeklyHours: parseFloat(row.target_weekly_hours != null ? row.target_weekly_hours : 0.0),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null
  };
}

/**
 * Formats a database task row into a TaskResponse object.
 */
function formatTask(row) {
  if (!row) return null;
  const startTime = normalizeTime(row.start_time);
  const durationMinutes = parseInt(row.duration_minutes, 10);
  const endTime = calculateEndTime(startTime, durationMinutes);
  const scheduledDate = row.scheduled_date instanceof Date ? formatDateIso(row.scheduled_date) : String(row.scheduled_date).split('T')[0];

  return {
    id: parseInt(row.id, 10),
    title: row.title,
    description: row.description || '',
    subjectId: parseInt(row.subject_id, 10),
    subjectName: row.subject_name || null,
    scheduledDate,
    startTime,
    endTime,
    durationMinutes,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null
  };
}

/**
 * Standard error response formatter matching Spring Boot's ErrorResponse contract.
 */
function createErrorResponse(status, errorTitle, message, path, validationErrors = null) {
  const err = {
    timestamp: new Date().toISOString(),
    status,
    error: errorTitle,
    message,
    path
  };
  if (validationErrors && Object.keys(validationErrors).length > 0) {
    err.validationErrors = validationErrors;
  }
  return err;
}

/**
 * Safely calculates percentage to 1 decimal place without division-by-zero errors.
 */
function calculatePercentage(part, total) {
  if (!total || total <= 0) return 0.0;
  const pct = (part * 100.0) / total;
  return Math.round(pct * 10.0) / 10.0;
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  normalizeTime,
  calculateEndTime,
  isOverlapping,
  formatDateIso,
  getMondayOfWeek,
  isTaskOverdue,
  formatSubject,
  formatTask,
  createErrorResponse,
  calculatePercentage
};
