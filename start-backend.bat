@echo off
echo Starting School Management Backend...
echo.
echo IMPORTANT: Stop any existing backend (Ctrl+C in its terminal) before starting.
echo.

set PHP_PATH=C:\xampp\php
set MYSQL_PATH=C:\xampp\mysql\bin
set PATH=%PHP_PATH%;%MYSQL_PATH%;%PATH%

cd /d "%~dp0backend"
echo Backend will be at http://localhost:8000
echo Press Ctrl+C to stop.
echo.
php artisan serve
pause
