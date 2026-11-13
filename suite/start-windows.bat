@echo off
setlocal
title RTIH Godavari Pushkaralu 2027 - local suite
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Install the LTS version from https://nodejs.org/  ^(Windows Installer .msi^), then double-click this file again.
  echo.
  start "" https://nodejs.org/en/download
  pause
  exit /b 1
)

if "%PORT%"=="" set PORT=8080
echo.
echo  Starting the suite on port %PORT% ...
echo  - Laptop:  http://localhost:%PORT%/
echo  - Phones on the same Wi-Fi: use the address printed below.
echo  If Windows Firewall asks, tick "Private networks" and click Allow so phones can connect.
echo.
start "" "http://localhost:%PORT%/"
node server\server.mjs
echo.
echo  The server stopped. Press any key to close.
pause >nul
