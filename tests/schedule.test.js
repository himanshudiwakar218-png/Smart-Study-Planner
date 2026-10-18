const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  isOverlapping,
  calculateEndTime,
  isTaskOverdue,
  formatDateIso,
  getMondayOfWeek,
  calculatePercentage,
  normalizeTime,
  timeToMinutes
} = require('../api/helpers');

describe('Schedule Logic & Time Math Unit Tests', () => {
  it('Adjacent tasks do NOT conflict (10:00-11:00 and 11:00-12:00)', () => {
    // Session 1: 10:00 to 11:00 (60 mins)
    // Session 2: 11:00 to 12:00 (60 mins)
    const overlap1 = isOverlapping('10:00:00', 60, '11:00:00', 60);
    const overlap2 = isOverlapping('11:00:00', 60, '10:00:00', 60);
    assert.strictEqual(overlap1, false, 'Adjacent task starting when another ends must not conflict');
    assert.strictEqual(overlap2, false, 'Commutative adjacent check must not conflict');
  });

  it('Overlapping tasks are detected (10:00-11:30 and 11:00-12:00)', () => {
    const overlap = isOverlapping('10:00:00', 90, '11:00:00', 60);
    assert.strictEqual(overlap, true, 'Intersecting sessions must be flagged as overlapping');
  });

  it('Separated non-overlapping tasks return false', () => {
    const overlap = isOverlapping('09:00:00', 60, '14:00:00', 60);
    assert.strictEqual(overlap, false, 'Separated tasks must not conflict');
  });

  it('Task contained entirely within another overlaps', () => {
    const overlap = isOverlapping('09:00:00', 180, '10:00:00', 60);
    assert.strictEqual(overlap, true, 'Nested sessions must be flagged as overlapping');
  });

  it('calculateEndTime calculates correct end times across hour boundaries', () => {
    assert.strictEqual(calculateEndTime('10:00:00', 60), '11:00:00');
    assert.strictEqual(calculateEndTime('09:30:00', 45), '10:15:00');
    assert.strictEqual(calculateEndTime('23:30:00', 60), '00:30:00');
  });

  it('isTaskOverdue flags non-completed past tasks as overdue', () => {
    const today = '2026-10-20';
    const currentTime = '14:00:00';

    // Yesterday's task pending -> overdue
    const taskYesterday = {
      status: 'PENDING',
      scheduledDate: '2026-10-19',
      startTime: '10:00:00',
      durationMinutes: 60
    };
    assert.strictEqual(isTaskOverdue(taskYesterday, today, currentTime), true);

    // Today's completed task -> NOT overdue
    const taskCompleted = {
      status: 'COMPLETED',
      scheduledDate: '2026-10-19',
      startTime: '10:00:00',
      durationMinutes: 60
    };
    assert.strictEqual(isTaskOverdue(taskCompleted, today, currentTime), false);

    // Today's task that ended at 11:00 when now is 14:00 -> overdue
    const taskTodayPast = {
      status: 'PENDING',
      scheduledDate: '2026-10-20',
      startTime: '10:00:00',
      durationMinutes: 60
    };
    assert.strictEqual(isTaskOverdue(taskTodayPast, today, currentTime), true);

    // Today's task scheduled at 15:00 when now is 14:00 -> NOT overdue
    const taskTodayFuture = {
      status: 'PENDING',
      scheduledDate: '2026-10-20',
      startTime: '15:00:00',
      durationMinutes: 60
    };
    assert.strictEqual(isTaskOverdue(taskTodayFuture, today, currentTime), false);
  });

  it('calculatePercentage handles normal and division-by-zero cases', () => {
    assert.strictEqual(calculatePercentage(0, 0), 0.0);
    assert.strictEqual(calculatePercentage(2, 4), 50.0);
    assert.strictEqual(calculatePercentage(1, 3), 33.3);
  });

  it('getMondayOfWeek returns correct Monday date', () => {
    // 2026-10-21 is a Wednesday
    const wednesday = new Date('2026-10-21T12:00:00');
    const monday = getMondayOfWeek(wednesday);
    assert.strictEqual(monday, '2026-10-19');
  });
});
