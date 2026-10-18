# Smart Study Planner — Backend REST API & Database Layer

A clean, robust, and beginner-friendly Spring Boot 3 backend service for **Smart Study Planner**, using Java 21, SQLite, Spring Data JPA, and Hibernate.

---

## 1. Prerequisites

- **Java**: Java Development Kit (JDK) 21 (e.g., Microsoft Build of OpenJDK 21 or Eclipse Temurin 21)
- **Maven**: Apache Maven 3.9+
- **Operating System**: Windows (tested with Windows PowerShell)
- **Database**: SQLite (embedded, no separate database server installation needed)

---

## 2. Java and Maven Setup (Windows)

Verify your Java and Maven installation in PowerShell:

```powershell
java -version
mvn -version
```

If `java` or `mvn` are not in your environment PATH, you can set them for your session:

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;C:\Users\Himanshu\tools\apache-maven-3.9.9\bin;$env:PATH"
```

---

## 3. Database Architecture & Persistence Layer

### Database Location

- **Standard Location**: `data/study-planner.db` (located at the project root).
- **Automatic Directory Creation**: `DatabaseConfig` automatically inspects the configured path and creates the `data/` directory if it does not exist.
- **Working Directory Resolution**: Whether executed from the repository root (`c:\Projects\smart study planner`) or inside `backend/`, the application automatically resolves relative paths to target the root `data/study-planner.db`.
- **Foreign Key Enforcement**: SQLite foreign keys are explicitly enforced across connections using `PRAGMA foreign_keys = ON;`.

### Database Tables & Schema

The repeatable SQLite DDL is documented in [`src/main/resources/schema.sqlite.sql`](src/main/resources/schema.sqlite.sql).

#### Table 1: `subjects`

Stores academic subjects and weekly target study commitments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique subject identifier |
| `name` | `VARCHAR(255)` | `NOT NULL UNIQUE` | Subject name (e.g., "Java Programming") |
| `description` | `VARCHAR(1000)` | Nullable | Optional course description or notes |
| `weekly_target_minutes` | `INTEGER` | `NOT NULL DEFAULT 0 CHECK (>= 0)` | Target study commitment in minutes |
| `target_weekly_hours` | `REAL` | `NOT NULL DEFAULT 0.0 CHECK (>= 0)` | Target study commitment in hours (synced) |
| `created_at` | `TIMESTAMP` | `NOT NULL` | Creation timestamp |
| `updated_at` | `TIMESTAMP` | Nullable | Last update timestamp |

**Indexes**:
- `idx_subjects_name` (Unique) on `name`

#### Table 2: `study_tasks`

Stores individual scheduled study tasks and assignments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY AUTOINCREMENT` | Unique task identifier |
| `title` | `VARCHAR(255)` | `NOT NULL` | Task title |
| `description` | `VARCHAR(1000)` | Nullable | Task details or syllabus references |
| `subject_id` | `INTEGER` | `NOT NULL`, `FOREIGN KEY -> subjects(id)` | Associated subject |
| `scheduled_date` | `DATE` | `NOT NULL` | Planned study date (`YYYY-MM-DD`) |
| `start_time` | `TIME` | `NOT NULL` | Planned start time (`HH:mm:ss`) |
| `duration_minutes` | `INTEGER` | `NOT NULL CHECK (duration_minutes > 0)` | Planned study duration |
| `priority` | `VARCHAR(20)` | `NOT NULL CHECK (IN ('LOW','MEDIUM','HIGH'))` | Priority badge |
| `status` | `VARCHAR(20)` | `NOT NULL CHECK (IN ('PENDING','IN_PROGRESS','COMPLETED'))` | Task status |
| `created_at` | `TIMESTAMP` | `NOT NULL` | Creation timestamp |
| `updated_at` | `TIMESTAMP` | `NOT NULL` | Last update timestamp |
| `completed_at` | `TIMESTAMP` | Nullable | Timestamp set when task marked complete |

**Indexes**:
- `idx_tasks_subject_id` on `subject_id`
- `idx_tasks_scheduled_date` on `scheduled_date`
- `idx_tasks_status` on `status`
- `idx_tasks_priority` on `priority`

---

## 4. Database Configuration & Migration Behavior

### Configuration (`src/main/resources/application.properties`)

```properties
# SQLite Database Configuration
sqlite.db-file=${SQLITE_DB_FILE:data/study-planner.db}
spring.datasource.url=jdbc:sqlite:${sqlite.db-file}
spring.datasource.driver-class-name=org.sqlite.JDBC

# JPA / Hibernate for SQLite
spring.jpa.database-platform=org.hibernate.community.dialect.SQLiteDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true

# Optional Development Sample Data (Disabled by default)
app.sample-data.enabled=${SAMPLE_DATA_ENABLED:false}
```

### Safe, Non-Destructive Initialization
- **`ddl-auto=update`**: Hibernate never drops existing tables upon restart.
- **`DatabaseSchemaMigration` Runner**: On application startup, a non-destructive migration runner inspects existing SQLite tables, safely adds missing columns (such as `weekly_target_minutes` and `updated_at`) with defaults, backfills legacy rows, and enables foreign keys. Real user records are strictly preserved.

---

## 5. Development Sample Data Seeding

The application includes an optional development sample data seeder (`SampleDataInitializer`).

- **Disabled by default**: Real user databases will never be populated with demo data unless explicitly requested.
- **Safe Execution**: Even if enabled, it only inserts records if the `subjects` table is completely empty (`count == 0`), preventing duplicate records or overwriting real data.
- **To Enable via Environment Variable or CLI**:
  ```powershell
  # Via PowerShell environment variable
  $env:SAMPLE_DATA_ENABLED = "true"
  mvn spring-boot:run
  ```
  or:
  ```powershell
  java -jar target/smart-study-planner-backend-1.0.0.jar --app.sample-data.enabled=true
  ```

Sample data includes:
- **Subjects**: *Java Programming* (8 hrs), *Data Structures and Algorithms* (10 hrs), *Introduction to Machine Learning* (6 hrs).
- **Tasks**: Completed practice session, an in-progress assignment, a pending revision task, and reading tasks with Low, Medium, and High priorities.

---

## 6. How to Back Up and Reset Development Data

### Backing Up the Database

To back up your study database on Windows:

```powershell
# Create a timestamped backup copy
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item "c:\Projects\smart study planner\data\study-planner.db" "c:\Projects\smart study planner\data\backup-study-planner-$timestamp.db"
Write-Host "Backup created: backup-study-planner-$timestamp.db"
```

### Resetting Development Data Safely

If you wish to reset your development database to a clean, empty state:

1. Stop the running backend server.
2. Back up or delete `data/study-planner.db`:
   ```powershell
   Remove-Item "c:\Projects\smart study planner\data\study-planner.db" -Force
   ```
3. Restart the backend. The database tables will be automatically created on startup.

---

## 7. Running Automated Database Tests

Automated tests are isolated and **never write to `data/study-planner.db`**. Test properties configure a temporary, dedicated SQLite database at `target/test-db/test-study-planner.db` that is automatically created and cleaned per test run.

### Run All 40 Automated Tests
```powershell
cd "c:\Projects\smart study planner\backend"
mvn clean test
```

### Run Only Database Persistence Tests
```powershell
mvn test -Dtest=DatabasePersistenceTest
```

Tests verify:
- Subject entity persistence, unique name constraint, and `weekly_target_minutes` synchronization.
- Task entity persistence, foreign-key relationships, and schedule queries.
- Record updates and timestamp tracking (`updated_at`).
- Safe deletion validation (refusal to delete subjects with active tasks).
- Task completion (`completed_at` populated) and reopening (`completed_at` cleared).
- Repository query filters (`findBySubjectId`, `findByScheduledDate`, `findByStatusAndPriority`).
- Overdue query detection (`findOverdueTasks`).
- Weekly progress calculations (`findByScheduledDateBetweenOrderByScheduledDateAscStartTimeAsc`).
- Disk persistence across direct independent JDBC connections.

---

## 8. Windows PowerShell Commands to Build and Run

All commands should be executed from the `backend/` directory:

```powershell
cd "c:\Projects\smart study planner\backend"
```

### Build & Package Executable JAR
```powershell
mvn clean package
```

### Run the Application (via Maven)
```powershell
mvn spring-boot:run
```

### Run the Packaged JAR (Production Mode)
```powershell
java -jar target/smart-study-planner-backend-1.0.0.jar
```

The application starts by default at:
```
http://localhost:8080
```

---

## 9. API Endpoints Reference

All endpoints are prefixed with `/api`.

### Subjects API (`/api/subjects`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/subjects` | Add a new subject (prevents duplicate names) |
| `GET` | `/api/subjects` | Retrieve all subjects |
| `GET` | `/api/subjects/{id}` | Retrieve subject details by ID |
| `PUT` | `/api/subjects/{id}` | Update subject name, description, or target weekly hours |
| `DELETE` | `/api/subjects/{id}` | Delete a subject (fails safely if tasks are attached) |

### Tasks API (`/api/tasks`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/tasks` | Create a new study task (validates slot overlap) |
| `GET` | `/api/tasks` | Retrieve tasks with optional filters (`subjectId`, `date`, `status`, `priority`) |
| `GET` | `/api/tasks/{id}` | Retrieve task details by ID |
| `PUT` | `/api/tasks/{id}` | Update a task (excluding self from overlap check) |
| `DELETE` | `/api/tasks/{id}` | Delete a study task |
| `PATCH` | `/api/tasks/{id}/complete` | Mark task as `COMPLETED` and timestamp `completed_at` |
| `PATCH` | `/api/tasks/{id}/reopen` | Reopen a completed task to `PENDING` |
| `GET` | `/api/tasks/today` | Retrieve today's scheduled tasks |
| `GET` | `/api/tasks/pending` | Retrieve all pending tasks |
| `GET` | `/api/tasks/overdue` | Retrieve all overdue tasks |

### Dashboard Analytics API (`/api/dashboard`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Overall metrics: total subjects, total tasks, completed, pending, overdue, total/completed study minutes, completion percentage |
| `GET` | `/api/dashboard/subjects` | Subject-wise progress percentages and minutes |
| `GET` | `/api/dashboard/daily?date=YYYY-MM-DD` | Daily breakdown for a specific date |
| `GET` | `/api/dashboard/weekly?startDate=YYYY-MM-DD` | 7-day schedule activity, daily totals, and subject distribution |

### Schedule Timetable API (`/api/schedule`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/schedule/day?date=YYYY-MM-DD` | Day schedule breakdown with study sessions |
| `GET` | `/api/schedule/week?startDate=YYYY-MM-DD` | 7-day timetable view with sessions |
| `POST` | `/api/schedule/validate` | Pre-checks time slot availability without creating task |
