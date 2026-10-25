@echo off
title Push Jarvis TV to GitHub
cd /d "%~dp0"

echo ========================================================
echo        🚀 Pushing Jarvis TV to GitHub
echo ========================================================
echo.
echo Target: https://github.com/praveenvivin/Jarvis-TV
echo Branch: main
echo.

git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Successfully pushed to GitHub!
    echo Check your live site: https://praveenvivin.github.io/Jarvis-TV/
) else (
    echo [NOTICE] If prompted for authentication, please sign in via browser.
)
echo.
pause
