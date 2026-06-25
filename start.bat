@echo off
title Visual Physics server
cd /d "%~dp0server"
echo.
echo   ============================================
echo    Visual Physics is starting...
echo.
echo    Open in browser:  http://localhost:3000
echo    Admin (leads):    http://localhost:3000/admin
echo.
echo    To stop: close this window or press Ctrl+C
echo   ============================================
echo.
call npm start
echo.
echo  Server stopped. Press any key to close.
pause >nul
