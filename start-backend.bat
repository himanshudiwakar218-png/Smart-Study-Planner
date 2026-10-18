@echo off
title Smart Study Planner - Backend Server
echo Starting Smart Study Planner Backend...

set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "PATH=%JAVA_HOME%\bin;C:\Users\Himanshu\tools\apache-maven-3.9.9\bin;%PATH%"

cd /d "%~dp0backend"
call mvn spring-boot:run
pause
