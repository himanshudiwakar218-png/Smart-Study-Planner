# Smart Study Planner — Frontend

The modern, responsive web frontend for the **Smart Study Planner** application. Built using clean **HTML5**, **Vanilla CSS3**, and **Vanilla JavaScript (ES6+)**, this dashboard communicates seamlessly with the Spring Boot 3 REST API backend.

---

## Features

- **Modern Student Dashboard (Overview)**:
  - Dynamic time-of-day greeting ("Good morning / afternoon / evening, ready to achieve your study goals?").
  - 5 High-level metric summary cards: Total Subjects, Total Study Tasks, Completed Tasks, Pending/Overdue Tasks, and Overall Completion Rate.
  - Today's study plan with one-click completion toggling.
  - Interactive Chart.js bar chart for weekly study activity (Scheduled vs. Completed minutes).
  - SVG Progress Ring displaying completion percentage and total study hours planned vs. completed.
  - Upcoming tasks feed and quick-action shortcuts (Add Task, Add Subject, View Schedule).

- **Subject Management (`My Subjects`)**:
  - Grid card view of active subjects with study goal hours, associated task counts, and progress bars.
  - Add & edit subject modal with client validation.
  - Safe deletion workflow with modal confirmation. Displays backend validation error (400) if tasks are still linked to the subject.

- **Study Schedule (Weekly Timetable)**:
  - 7-Day interactive schedule grid (Monday to Sunday) with hour rows (06:00 to 22:00).
  - Week switcher (Previous Week, Current Week indicator, Next Week).
  - Visual task cards placed in their exact time slots with subject tag, duration, and priority styling.
  - Click any open time slot to launch the task scheduler prefilled with that date and time.
  - Pre-submission schedule conflict check (`POST /api/schedule/validate`) to detect overlapping sessions before saving.

- **Task & Assignment Management (`Tasks & Assignments`)**:
  - Filter by status tabs: All, Pending, In Progress, Completed, and Overdue.
  - Multi-criteria filter bar: Filter by Subject, Priority (Low, Medium, High), and Date.
  - Real-time search across task titles and descriptions.
  - One-click status actions: Mark Complete (`PATCH /tasks/{id}/complete`) and Reopen (`PATCH /tasks/{id}/reopen`).
  - Edit and Delete modals with error handling.

- **Progress & Analytics (`Progress & Analytics`)**:
  - Overall study metrics (total tasks, completion percentage, total scheduled study hours, completed study hours).
  - Subject-wise completion chart (Chart.js horizontal bar chart comparing completed vs. remaining tasks per subject).
  - Daily activity breakdown table showing scheduled study time vs. completed study time.

- **Settings & API Configuration (`Settings`)**:
  - Change backend API base URL directly from the UI (stored in `localStorage`).
  - Test backend connectivity button with latency readout.
  - Toggle optional Demo Mode (for offline presentations or UI testing when the backend is stopped).
  - Customizable student profile (name and academic role/major).

- **Reliability & State Handling**:
  - Persistent backend connectivity indicator (green/amber dot in sidebar).
  - Friendly connection error banner when backend is offline with instant "Retry" action.
  - Non-blocking toast notification system for success, warning, and error alerts.
  - Keyboard accessible: `Escape` closes any modal, `/` focuses global search.

---

## Design System & Palette

Designed to provide a high-end, distraction-free productivity environment tailored for students:

| Element | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary Blue** | `#3B82F6` | Primary buttons, active tabs, main accents |
| **Light Blue** | `#EAF3FF` | Active background pills, subtle cards |
| **Background** | `#F6F9FF` | Application backdrop |
| **Cards & Surfaces** | `#FFFFFF` | Content containers, modal dialogs |
| **Main Text** | `#172B4D` | Headings, primary labels, bold metrics |
| **Secondary Text** | `#718096` | Subtitles, timestamps, placeholders |
| **Success** | `#22C55E` | Completed tasks, high progress, badges |
| **Warning** | `#F59E0B` | In-progress sessions, medium priority |
| **Danger** | `#EF4444` | High priority badges, overdue alerts, delete buttons |

Typography uses **Inter** via Google Fonts. Icons are rendered via **Lucide Icons**.

---

## File Structure

```
frontend/
├── index.html          # Semantic HTML5 single-page application structure
├── style.css           # Vanilla CSS3 styling, design variables, and responsive grid/flexbox
├── script.js           # Vanilla JS application state, API fetch client, Chart.js managers
├── README.md           # Frontend documentation and usage guide
└── assets/
    └── logo.svg        # Vector application branding logo
```

---

## How to Run on Windows

Because the frontend uses standard browser web APIs (Fetch, modern ES modules), it should be served via a local HTTP server to avoid local `file://` CORS limitations.

### Option 1: Python HTTP Server (Recommended)

Open PowerShell in the `frontend/` directory:

```powershell
cd "c:\Projects\smart study planner\frontend"
python -m http.server 5500
```

Then open your browser at:
`http://localhost:5500`

### Option 2: Node.js `http-server` or `serve`

```powershell
cd "c:\Projects\smart study planner\frontend"
npx serve -l 5500
```

### Option 3: VS Code / IDE Live Server Extension

If using VS Code or Antigravity IDE, right-click `index.html` and select **"Open with Live Server"**.

---

## Connecting to the Backend

The frontend defaults to connecting to:
```
http://localhost:8080/api
```

### Starting the Backend
In a separate terminal:
```powershell
cd "c:\Projects\smart study planner\backend"
mvn spring-boot:run
```
*(Or execute the pre-built JAR: `java -jar target/smart-study-planner-backend-1.0.0.jar`)*

### Changing the API URL
If your backend is running on a different port or host:
1. Navigate to **Settings** in the sidebar.
2. Update the **Backend API Base URL** field (e.g., `http://192.168.1.50:8080/api`).
3. Click **"Save Settings"**.

### Demo Mode
If the backend is not yet started or you want to demonstrate the interface offline:
- Click **"Enable Demo Mode"** in the top warning banner or in **Settings**.
- The app will use an interactive in-memory store simulating all CRUD operations, charts, and conflict validations.
- When the Spring Boot backend comes online, the app automatically switches to live backend data.
