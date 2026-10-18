@echo off
title Smart Study Planner Launcher
echo ===================================================
echo   Launching Smart Study Planner (Backend + Frontend)
echo ===================================================

set "BASE_DIR=%~dp0"

echo [1/3] Starting Backend Server on port 8080...
start "Smart Study Planner - Backend" cmd /k "cd /d ""%BASE_DIR%"" && call start-backend.bat"

echo [2/3] Starting Frontend Server on port 5500...
start "Smart Study Planner - Frontend" cmd /k "cd /d ""%BASE_DIR%"" && call start-frontend.bat"

echo [3/3] Opening browser at http://localhost:5500...
timeout /t 3 /nobreak >nul
start http://localhost:5500

echo Application successfully launched!
