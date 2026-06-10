@echo off
setlocal enabledelayedexpansion
title SMRS Launcher

echo ===================================================
echo   CTech SMRS ^| Student Monitoring ^& Recording
echo ===================================================
echo.

:: ─── Auto-detect WLAN (Wi-Fi) IP ──────────────────────────────────────────
echo [1/4] Detecting Wi-Fi (WLAN) IP address...
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command ^
    "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { ($_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*WLAN*' -or $_.InterfaceDescription -like '*Wireless*') -and $_.InterfaceAlias -notlike '*Virtual*' -and $_.InterfaceAlias -notlike '*Pseudo*' -and $_.IPAddress -notlike '169.*' }).IPAddress | Select-Object -First 1"`) do set SERVER_IP=%%i

if "%SERVER_IP%"=="" (
    echo [WARNING] Could not auto-detect Wi-Fi IP.
    echo Make sure Wi-Fi is connected and not bridged by a virtual adapter.
    echo.
    ipconfig | findstr /i "IPv4"
    echo.
    set /p SERVER_IP="Enter your WLAN IPv4 address manually (e.g. 192.168.254.107): "
)

if "%SERVER_IP%"=="" (
    echo [ERROR] No IP address provided. Exiting.
    pause
    exit /b 1
)

echo     Detected IP: %SERVER_IP%
echo.

:: ─── Check / Update .env.production ───────────────────────────────────────
echo [2/4] Checking frontend API configuration...
set NEED_BUILD=0

if exist "frontend\.env.production" (
    findstr /C:"VITE_API_BASE=http://%SERVER_IP%:8000" "frontend\.env.production" >nul 2>&1
    if errorlevel 1 (
        echo     IP changed — updating frontend\.env.production...
        echo VITE_API_BASE=http://%SERVER_IP%:8000> "frontend\.env.production"
        set NEED_BUILD=1
    ) else (
        echo     Config is up-to-date.
    )
) else (
    echo     Creating frontend\.env.production...
    echo VITE_API_BASE=http://%SERVER_IP%:8000> "frontend\.env.production"
    set NEED_BUILD=1
)
echo.

:: ─── Build frontend if needed ──────────────────────────────────────────────
echo [3/4] Frontend build...
if "%NEED_BUILD%"=="1" (
    echo     API URL changed — rebuilding frontend now...
    cd frontend
    call npm run build
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Build failed. Make sure Node.js is installed and run 'npm install' in the frontend folder.
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo     Build complete.
) else (
    echo     No rebuild needed ^(IP unchanged^).
)
echo.

:: ─── Launch services ───────────────────────────────────────────────────────
echo [4/4] Launching SMRS services...
echo.

:: Backend — bind to 0.0.0.0 so it's reachable on all interfaces
echo     Starting Backend  ^> http://%SERVER_IP%:8000
start "SMRS Backend" cmd /k "title SMRS Backend && cd /d "%~dp0backend" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

:: Small delay so backend gets a head start
timeout /t 2 /nobreak >nul

:: Frontend — bind serve explicitly to the WLAN IP so it reports the right address
:: Using --listen tcp:%SERVER_IP%:3000 makes serve bind only to the WLAN adapter
echo     Starting Frontend ^> http://%SERVER_IP%:3000
start "SMRS Frontend" cmd /k "title SMRS Frontend && cd /d "%~dp0frontend" && npx serve -s dist --listen tcp:%SERVER_IP%:3000"

echo.
echo ===================================================
echo   SMRS is running!
echo.
echo   Local access:   http://localhost:3000
echo   Network access: http://%SERVER_IP%:3000
echo   API backend:    http://%SERVER_IP%:8000
echo.
echo   Share the Network access URL with other devices.
echo   Make sure Windows Firewall allows ports 3000 and 8000.
echo ===================================================
echo.
pause
