/**
 * Smart Study Planner — Local Full-Stack Development Server
 * Serves both the frontend and serverless API on a single unified port.
 */
const express = require('express');
const path = require('path');
require('dotenv').config();

const apiApp = require('./api/index');
const db = require('./api/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Mount API application
app.use(apiApp);

// Serve frontend static assets
const frontendDir = path.join(__dirname, 'frontend');
app.use(express.static(frontendDir));

// Fallback for SPA routing to frontend/index.html (excluding /api routes)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Start listening
app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(` Smart Study Planner Full-Stack Server Running`);
  console.log(` > Web App:  http://localhost:${PORT}`);
  console.log(` > REST API: http://localhost:${PORT}/api`);
  console.log('====================================================');

  try {
    await db.ensureSchema();
    console.log('[Database] PostgreSQL schema verified successfully.');
  } catch (err) {
    console.warn('[Database Notice]', err.message);
  }
});

module.exports = app;
