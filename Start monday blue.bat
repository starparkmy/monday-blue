@echo off
cd /d "%~dp0"
title monday blue - Local Server
echo Starting monday blue...
echo Open http://127.0.0.1:5173 in your browser.
echo Keep this window open. Press Ctrl+C to stop.
call npm run dev -- --port 5173
pause
