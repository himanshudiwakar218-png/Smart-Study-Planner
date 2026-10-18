@echo off
title Smart Study Planner - Frontend Server
echo Starting Smart Study Planner Frontend on http://localhost:5500...

cd /d "%~dp0frontend"
python -m http.server 5500
pause
