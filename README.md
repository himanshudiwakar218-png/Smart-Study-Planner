# Smart Study Planner

Smart Study Planner is an academic productivity application designed to help students manage subjects, organize study sessions, schedule tasks without conflicts, and track study progress.

## Project Structure

- `backend/`: Spring Boot 3 REST API built with Java 21, SQLite, and Hibernate.
  - See [backend/README.md](backend/README.md) for build, testing, API documentation, and database configuration.
- `frontend/`: Web user interface using HTML, CSS, and Vanilla JavaScript (communicates with the backend at `http://localhost:8080/api`).
  - See [frontend/README.md](frontend/README.md) for UI layout, features, and configuration details.
- `data/`: SQLite database storage (`data/study-planner.db`).

---

## Quick Start (Easiest Way on Windows)

### 1-Click Complete Launch
Double-click [`start-all.bat`](start-all.bat) or run from PowerShell:
```powershell
.\start-all.bat
```
This automatically starts the Spring Boot backend, the frontend HTTP server, and opens your browser at `http://localhost:5500`.

---

## Running in VS Code

### Option A: Using VS Code Run / Debug Menu (F5)
1. Open the project in VS Code (`File > Open Folder... > c:\Projects\smart study planner`).
2. Press **F5** or open the **Run & Debug** tab (`Ctrl+Shift+D`).
3. Select **"Spring Boot - Smart Study Planner Backend"** and click the green Play button.
4. Open the frontend: run task **"Start Frontend (HTTP Server)"** or double-click `start-frontend.bat`.

### Option B: Using VS Code Tasks Menu
1. In the top menu, go to **Terminal > Run Task...**.
2. Select **"Start Backend (Spring Boot)"** or **"Start Frontend (HTTP Server)"**.

### Option C: Using VS Code Integrated Terminal
Open a new integrated terminal (`Ctrl+\``) and run:

**Terminal 1 (Backend):**
```powershell
cd backend
mvn spring-boot:run
```
*(The backend will be live at `http://localhost:8080/api`)*

**Terminal 2 (Frontend):**
```powershell
cd frontend
python -m http.server 5500
```
*(Open your browser at `http://localhost:5500`)*

---

## Troubleshooting in VS Code

If you encounter issues running the project in VS Code:
1. **Wrong Directory Error** (`[ERROR] The goal you specified requires a project to execute but there is no POM in this directory`):
   - You must run `cd backend` first before running `mvn`, because `pom.xml` is located in the `backend/` folder.
2. **`mvn` or `java` is not recognized**:
   - Close and restart VS Code so it picks up the latest Windows environment variables.
   - Alternatively, our pre-configured [`.vscode/settings.json`](.vscode/settings.json) automatically loads Java 21 and Maven paths into VS Code terminals.
   - Or run [`start-all.bat`](start-all.bat) which explicitly configures the runtime environment.
