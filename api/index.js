/**
 * Vercel Serverless Function & Express Application Entry Point
 * Exposes the full REST API contract with PostgreSQL persistence.
 */
const express = require('express');
const cors = require('cors');

const subjectsRouter = require('./routes/subjects');
const tasksRouter = require('./routes/tasks');
const scheduleRouter = require('./routes/schedule');
const dashboardRouter = require('./routes/dashboard');

const app = express();

// Enable CORS for all origins
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Healthcheck and API discovery endpoints
app.get(['/', '/api', '/api/health'], (req, res) => {
  res.json({
    status: 'UP',
    name: 'Smart Study Planner Serverless API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/subjects',
      '/api/tasks',
      '/api/schedule',
      '/api/dashboard'
    ]
  });
});

// Mount routers under /api/ prefix
app.use('/api/subjects', subjectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/dashboard', dashboardRouter);

// Also mount without /api prefix for flexibility with custom rewrites
app.use('/subjects', subjectsRouter);
app.use('/tasks', tasksRouter);
app.use('/schedule', scheduleRouter);
app.use('/dashboard', dashboardRouter);

// Standard 404 handler matching Spring Boot error response format
app.use((req, res) => {
  res.status(404).json({
    timestamp: new Date().toISOString(),
    status: 404,
    error: 'Not Found',
    message: `No endpoint found for ${req.method} ${req.originalUrl}`,
    path: req.originalUrl
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[API Error]', err);
  res.status(500).json({
    timestamp: new Date().toISOString(),
    status: 500,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected internal error occurred.',
    path: req.originalUrl
  });
});

module.exports = app;
