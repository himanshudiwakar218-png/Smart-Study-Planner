const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../api/index');
const db = require('../api/db');
const { formatDateIso } = require('../api/helpers');

describe('Full Serverless REST API Integration Tests', () => {
  let createdSubjectId;
  let createdTaskId;
  let testDate;

  before(async () => {
    process.env.NODE_ENV = 'test';
    await db.ensureSchema();
    await db.query('DELETE FROM study_tasks;');
    await db.query('DELETE FROM subjects;');

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);
    testDate = formatDateIso(futureDate);
  });

  after(async () => {
    await db.closePool();
  });

  // --- 1. Healthcheck & Metadata ---
  it('GET /api/health returns 200 UP', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'UP');
    assert.ok(Array.isArray(res.body.endpoints));
  });

  // --- 2. Subjects Endpoints ---
  it('POST /api/subjects creates a new subject (201)', async () => {
    const res = await request(app)
      .post('/api/subjects')
      .send({
        name: 'Computer Networks',
        description: 'OSI model, TCP/IP, and Routing protocols',
        targetWeeklyHours: 8.5
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.name, 'Computer Networks');
    assert.strictEqual(res.body.targetWeeklyHours, 8.5);
    assert.ok(res.body.id);
    createdSubjectId = res.body.id;
  });

  it('POST /api/subjects returns 409 Conflict for duplicate subject name', async () => {
    const res = await request(app)
      .post('/api/subjects')
      .send({
        name: 'computer networks', // Case-insensitive duplicate
        description: 'Duplicate course',
        targetWeeklyHours: 5.0
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.status, 409);
    assert.ok(res.body.message.includes('already exists'));
  });

  it('POST /api/subjects returns 400 Bad Request for blank name', async () => {
    const res = await request(app)
      .post('/api/subjects')
      .send({
        name: '',
        description: 'No name',
        targetWeeklyHours: 4.0
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.status, 400);
    assert.ok(res.body.validationErrors.name);
  });

  it('GET /api/subjects returns list of subjects (200)', async () => {
    const res = await request(app).get('/api/subjects');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].name, 'Computer Networks');
  });

  it('GET /api/subjects/:id returns subject details (200)', async () => {
    const res = await request(app).get(`/api/subjects/${createdSubjectId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, createdSubjectId);
    assert.strictEqual(res.body.name, 'Computer Networks');
  });

  it('GET /api/subjects/9999 returns 404 Not Found', async () => {
    const res = await request(app).get('/api/subjects/9999');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.status, 404);
  });

  it('PUT /api/subjects/:id updates subject successfully (200)', async () => {
    const res = await request(app)
      .put(`/api/subjects/${createdSubjectId}`)
      .send({
        name: 'Advanced Computer Networks',
        description: 'Updated network security and SDN',
        targetWeeklyHours: 10.0
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Advanced Computer Networks');
    assert.strictEqual(res.body.targetWeeklyHours, 10.0);
  });

  // --- 3. Task Creation, Overlaps, & Intervals ---
  it('POST /api/tasks creates a task and computes endTime (201)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Packet Analysis Lab',
        description: 'Wireshark packet capture analysis',
        subjectId: createdSubjectId,
        scheduledDate: testDate,
        startTime: '10:00:00',
        durationMinutes: 60,
        priority: 'HIGH',
        status: 'PENDING'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.title, 'Packet Analysis Lab');
    assert.strictEqual(res.body.startTime, '10:00:00');
    assert.strictEqual(res.body.endTime, '11:00:00');
    assert.strictEqual(res.body.subjectName, 'Advanced Computer Networks');
    assert.strictEqual(res.body.status, 'PENDING');
    createdTaskId = res.body.id;
  });

  it('POST /api/tasks permits adjacent task starting right when first ends (201)', async () => {
    // First task: 10:00 to 11:00.
    // Adjacent task: 11:00 to 12:00. Must SUCCEED.
    const res = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Subnetting Exercises',
        description: 'CIDR notation practice',
        subjectId: createdSubjectId,
        scheduledDate: testDate,
        startTime: '11:00:00',
        durationMinutes: 60,
        priority: 'MEDIUM',
        status: 'PENDING'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.title, 'Subnetting Exercises');
  });

  it('POST /api/tasks rejects overlapping task with 409 Conflict', async () => {
    // Overlapping interval: 10:30 to 11:30 (overlaps with both tasks)
    const res = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Conflicting Study Block',
        description: 'Should be rejected',
        subjectId: createdSubjectId,
        scheduledDate: testDate,
        startTime: '10:30:00',
        durationMinutes: 60,
        priority: 'LOW',
        status: 'PENDING'
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.status, 409);
    assert.ok(res.body.message.includes('Scheduling conflict detected'));
  });

  it('POST /api/tasks returns 400 for non-positive duration', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Zero minute task',
        subjectId: createdSubjectId,
        scheduledDate: testDate,
        startTime: '14:00:00',
        durationMinutes: 0
      });

    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('greater than zero'));
  });

  it('POST /api/tasks returns 404 for invalid subjectId', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({
        title: 'Invalid subject task',
        subjectId: 8888,
        scheduledDate: testDate,
        startTime: '15:00:00',
        durationMinutes: 45
      });

    assert.strictEqual(res.status, 404);
  });

  // --- 4. Task Filtering, Status, Completion, Reopen ---
  it('GET /api/tasks supports filtering and sorting', async () => {
    const res = await request(app)
      .get(`/api/tasks?subjectId=${createdSubjectId}&status=PENDING&sortBy=startTime&sortDirection=asc`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.strictEqual(res.body.length, 2);
    assert.strictEqual(res.body[0].startTime, '10:00:00');
    assert.strictEqual(res.body[1].startTime, '11:00:00');
  });

  it('PATCH /api/tasks/:id/complete marks task as COMPLETED with timestamp', async () => {
    const res = await request(app).patch(`/api/tasks/${createdTaskId}/complete`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'COMPLETED');
    assert.ok(res.body.completedAt);
  });

  it('PATCH /api/tasks/:id/reopen restores task to PENDING and clears completedAt', async () => {
    const res = await request(app).patch(`/api/tasks/${createdTaskId}/reopen`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'PENDING');
    assert.strictEqual(res.body.completedAt, null);
  });

  // --- 5. Schedule Conflict Validation & Schedule Views ---
  it('POST /api/schedule/validate checks proposed slot without inserting', async () => {
    // Slot that conflicts with 10:00-11:00
    const conflictRes = await request(app)
      .post('/api/schedule/validate')
      .send({
        scheduledDate: testDate,
        startTime: '10:15:00',
        durationMinutes: 30
      });

    assert.strictEqual(conflictRes.status, 200);
    assert.strictEqual(conflictRes.body.valid, false);
    assert.strictEqual(conflictRes.body.conflicts.length, 1);

    // Free slot at 16:00
    const freeRes = await request(app)
      .post('/api/schedule/validate')
      .send({
        scheduledDate: testDate,
        startTime: '16:00:00',
        durationMinutes: 45
      });

    assert.strictEqual(freeRes.status, 200);
    assert.strictEqual(freeRes.body.valid, true);
    assert.strictEqual(freeRes.body.conflicts.length, 0);
  });

  it('GET /api/schedule/day returns daily totals and subject breakdown', async () => {
    const res = await request(app).get(`/api/schedule/day?date=${testDate}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalTasks, 2);
    assert.strictEqual(res.body.totalMinutes, 120);
    assert.strictEqual(res.body.subjectMinutes['Advanced Computer Networks'], 120);
  });

  it('GET /api/schedule/week returns 7-day schedule breakdown', async () => {
    const res = await request(app).get(`/api/schedule/week?startDate=${testDate}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.days.length, 7);
    assert.strictEqual(res.body.totalWeekMinutes, 120);
  });

  // --- 6. Dashboard Metrics & Analytics ---
  it('GET /api/dashboard/summary calculates overall metrics', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalSubjects, 1);
    assert.strictEqual(res.body.totalTasks, 2);
    assert.strictEqual(res.body.pendingTasks, 2);
    assert.strictEqual(res.body.totalScheduledMinutes, 120);
  });

  it('GET /api/dashboard/subjects returns per-subject progress', async () => {
    const res = await request(app).get('/api/dashboard/subjects');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.length, 1);
    assert.strictEqual(res.body[0].subjectName, 'Advanced Computer Networks');
    assert.strictEqual(res.body[0].totalTasks, 2);
    assert.strictEqual(res.body[0].totalScheduledMinutes, 120);
  });

  // --- 7. Foreign Key Deletion Protection ---
  it('DELETE /api/subjects/:id is blocked (400) when tasks reference it', async () => {
    const res = await request(app).delete(`/api/subjects/${createdSubjectId}`);
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.message.includes('task(s) are still associated'));
  });

  it('DELETE /api/tasks/:id deletes tasks (204)', async () => {
    const res = await request(app).delete(`/api/tasks/${createdTaskId}`);
    assert.strictEqual(res.status, 204);
  });

  it('DELETE /api/subjects/:id succeeds (204) after remaining tasks are deleted', async () => {
    // Clean up second task
    const tasksRes = await request(app).get(`/api/tasks?subjectId=${createdSubjectId}`);
    for (const t of tasksRes.body) {
      await request(app).delete(`/api/tasks/${t.id}`);
    }

    const res = await request(app).delete(`/api/subjects/${createdSubjectId}`);
    assert.strictEqual(res.status, 204);

    const check = await request(app).get(`/api/subjects/${createdSubjectId}`);
    assert.strictEqual(check.status, 404);
  });

  // --- 8. Error Formatting ---
  it('Unmapped routes return standardized 404 error response', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error, 'Not Found');
    assert.ok(res.body.timestamp);
    assert.strictEqual(res.body.path, '/api/non-existent-endpoint');
  });
});
