@echo off
cd /d "%~dp0"
title monday blue - Local Server
if exist "%~dp0.runtime\PFiles64\nodejs\npm.cmd" (
  set "PATH=%~dp0.runtime\PFiles64\nodejs;%PATH%"
)
where npm >nul 2>&1
if errorlevel 1 (
  echo Node.js with npm is required to start monday blue.
  echo Install Node.js 22.13 or later from https://nodejs.org/en/download
  echo Then close and reopen this window, and run this file again.
  pause
  exit /b 1
)
if not exist node_modules\vite\bin\vite.js (
  echo Installing project dependencies for the first run...
  call npm ci
  if errorlevel 1 (
    echo Dependency installation failed. Check the error above.
    pause
    exit /b 1
  )
)
echo Starting monday blue...
echo Open http://127.0.0.1:5173 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
call npm run dev -- --port 5173
pause
