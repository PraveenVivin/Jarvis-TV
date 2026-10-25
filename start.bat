@echo off
title Jarvis TV Remote Server
cd /d "%~dp0"

echo ========================================================
echo       🎬 Starting Jarvis TV Remote (PWA)
echo ========================================================
echo.

if not exist "node_modules\" (
    echo [Info] Installing dependencies...
    call npm install
)

if not exist "icons\icon-192.png" (
    echo [Info] Generating PWA icons...
    call node generate_icons.js
)

start http://localhost:3000
node server.js
pause
