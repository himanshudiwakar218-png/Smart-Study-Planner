# Smart Study Planner

Smart Study Planner is an academic productivity application designed to help students manage subjects, organize study sessions, schedule tasks without conflicts, track study metrics, and visualize analytics.

This project is configured for serverless deployment on **Vercel** with a persistent **PostgreSQL** database (e.g., [Neon](https://neon.tech), Supabase, or Vercel Postgres), while preserving the original Java 21 Spring Boot backend for reference and backward compatibility.

---

## Architecture Overview

```mermaid
flowchart TD
    Client[Browser / Frontend Client] -->|Static Assets| VercelStatic[Vercel Static Edge CDN]
    Client -->|API Requests /api/*| VercelAPI[Vercel Serverless Function Node.js Express]
    VercelAPI -->|Pooled Queries with SSL| Postgres[(PostgreSQL Database e.g. Neon)]
    
    subgraph Legacy / Local Reference
        Spring[Java 21 Spring Boot Backend] --> SQLite[(SQLite Database data/study-planner.db)]
    end
```

- **Frontend**: Vanilla ES6+ JavaScript, CSS, HTML5, Chart.js, Lucide Icons. Configured with same-origin `/api` calls.
- **Serverless API**: Node.js Express application running as a Vercel Serverless Function (`api/index.js`).
- **Database**: PostgreSQL with parameterized queries, connection pooling, and automatic non-destructive schema initialization.
- **Reference Backend**: Java 21 Spring Boot 3.3.4 with Spring Data JPA & SQLite (`backend/`).

---

## Project Structure

```
├── api/
│   ├── db.js                     # Postgres pool, SSL config, and safe schema initializer
│   ├── helpers.js                # Time interval math, conflict detection, formatters
│   ├── routes/
│   │   ├── subjects.js           # CRUD operations for /api/subjects
│   │   ├── tasks.js              # CRUD, filters, /today, /pending, /overdue, /complete, /reopen
│   │   ├── schedule.js           # /api/schedule/day, /week, /validate
│   │   └── dashboard.js          # /api/dashboard/summary, /subjects, /daily, /weekly
│   └── index.js                  # Main serverless entry point & Express router
├── frontend/                     # Web user interface
│   ├── index.html                # App layout, modals, and settings
│   ├── script.js                 # App state, API engine, chart rendering
│   ├── style.css                 # Styling & theme variables
│   └── assets/                   # Static icons and assets
├── backend/                      # Reference Java 21 Spring Boot backend
├── data/                         # SQLite database (data/study-planner.db)
├── scripts/
│   ├── init-db.js                # Database initialization script (npm run db:init)
│   └── migrate-sqlite-to-postgres.js # SQLite to PostgreSQL migration script
├── tests/
│   ├── api.test.js               # Full REST API integration test suite
│   └── schedule.test.js          # Unit tests for interval overlap and time math
├── vercel.json                   # Vercel deployment & routing configuration
├── server.js                     # Unified local full-stack dev server
├── package.json                  # Node.js dependencies, scripts, and engine specs
├── .env.example                  # Environment variable template
└── start-dev.bat                 # 1-click local launch script for Windows
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js (v18.0.0 or higher, v20+ recommended)
- Python 3 (optional, for SQLite migration script)
- Java 21 & Maven 3.9+ (optional, only if running legacy Java backend)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` to include your PostgreSQL connection string (e.g. from Neon):
```env
DATABASE_URL=postgresql://user:password@ep-your-instance.us-east-2.aws.neon.tech/neondb?sslmode=require
PORT=3000
NODE_ENV=development
```
*(Note: If `DATABASE_URL` is omitted during local development or unit testing, an in-memory database automatically runs.)*

### Step 3: Run the Development Server
```bash
npm run dev
```
*(Or double-click `start-dev.bat` on Windows)*

Open your browser at:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **REST API Discovery**: [http://localhost:3000/api](http://localhost:3000/api)
- **Healthcheck**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

---

## PostgreSQL Database Setup (e.g. Neon)

1. Sign up for a free account at [Neon](https://neon.tech) (or Supabase / Vercel Postgres).
2. Create a new project (e.g., `smart-study-planner`).
3. Copy the **Connection String** from your dashboard (choose the "Pooled connection" or direct connection string with `sslmode=require`).
4. Paste the connection string into your `.env` file as `DATABASE_URL`.
5. Run the schema initialization script:
   ```bash
   npm run db:init
   ```
   *(Note: The serverless API also automatically executes non-destructive `CREATE TABLE IF NOT EXISTS` checks on startup).*

### (Optional) Migrating Existing SQLite Records
If you have existing subjects and tasks in `data/study-planner.db` that you wish to transfer to PostgreSQL:
```bash
npm run db:migrate-sqlite
```
This script safely copies existing subjects and tasks into PostgreSQL without duplicates or overwrites and synchronizes primary key sequences.

---

## Vercel Deployment Instructions

### Step 1: Push Changes to GitHub
```bash
git add .
git commit -m "Migrate Smart Study Planner to Vercel Serverless with PostgreSQL"
git push origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New... > Project**.
3. Select your GitHub repository: `himanshudiwakar218-png/Smart-Study-Planner`.
4. Leave **Framework Preset** as **Other** (or Express/Node.js).
5. Leave **Root Directory** as `./`.

### Step 3: Configure Environment Variables in Vercel
Under the **Environment Variables** section in Vercel, add:
| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` | Your Neon / PostgreSQL pooled connection string |
| `NODE_ENV` | `production` | Production environment flag |

### Step 4: Deploy
Click **Deploy**.
Vercel will:
1. Deploy the static frontend files from `frontend/`.
2. Build and deploy the serverless function from `api/index.js`.
3. Route `/api/*` requests to the serverless function and all other routes to the static frontend per `vercel.json`.

---

## API Contract Reference

All endpoints return standardized JSON payloads and use proper HTTP status codes.

### Subjects
- `GET /api/subjects`: List all subjects.
- `GET /api/subjects/:id`: Get subject by ID (404 if not found).
- `POST /api/subjects`: Create a subject (`{ name, description, targetWeeklyHours }`). Enforces unique names (case-insensitive). Returns `201 Created`.
- `PUT /api/subjects/:id`: Update subject details. Returns `200 OK`.
- `DELETE /api/subjects/:id`: Delete subject. Returns `400 Bad Request` if tasks are still linked to it; otherwise `204 No Content`.

### Tasks
- `GET /api/tasks`: Filtered task list. Supports query parameters:
  - `subjectId`, `date`, `status`, `priority`, `sortBy` (`date`, `startTime`, `title`, `status`, `priority`), and `sortDirection` (`asc`, `desc`).
- `GET /api/tasks/:id`: Get task by ID.
- `POST /api/tasks`: Create task (`{ title, description, subjectId, scheduledDate, startTime, durationMinutes, priority, status }`).
  - Validates subject existence.
  - Enforces interval overlap validation. Adjacent tasks (e.g. 10:00-11:00 and 11:00-12:00) succeed; overlapping intervals return `409 Conflict`.
- `PUT /api/tasks/:id`: Update task. Excludes the current task from conflict detection.
- `DELETE /api/tasks/:id`: Delete task (`204 No Content`).
- `GET /api/tasks/today`: Tasks scheduled for today's date.
- `GET /api/tasks/pending`: Tasks with `PENDING` status.
- `GET /api/tasks/overdue`: Overdue tasks (scheduled date/time has passed and not completed).
- `PATCH /api/tasks/:id/complete`: Marks task as `COMPLETED` and sets `completedAt`.
- `PATCH /api/tasks/:id/reopen`: Reopens task to `PENDING` and clears `completedAt`.

### Schedule
- `GET /api/schedule/day?date=`: Single-day schedule with total tasks, minutes, task list, and subject breakdown.
- `GET /api/schedule/week?startDate=`: 7-day schedule with daily breakdowns and aggregated subject minutes.
- `POST /api/schedule/validate`: Checks whether a proposed time slot conflicts with existing tasks without saving (`{ valid: boolean, message: string, conflicts: [] }`).

### Dashboard
- `GET /api/dashboard/summary`: Overall metrics (total subjects, total tasks, pending, in progress, completed, overdue, today's tasks, total scheduled minutes, completed study minutes, completion percentage).
- `GET /api/dashboard/subjects`: Subject-by-subject completion percentage and scheduled/completed minutes.
- `GET /api/dashboard/daily?date=`: Day summary breakdown.
- `GET /api/dashboard/weekly?startDate=`: 7-day weekly study analytics.

---

## Running Automated Tests

### Node.js Serverless API Tests (33 tests)
```bash
npm test
```
Tests all API endpoints, HTTP methods, subject/task CRUD, schedule conflicts, filters, status transitions, dashboard aggregations, and error handling.

### Java Backend Tests (40 tests)
```bash
cd backend
mvn test
```
Verifies that the reference Java Spring Boot backend remains 100% functional and intact.
