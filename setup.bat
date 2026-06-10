@echo off
setlocal enabledelayedexpansion
title SMRS Setup — One-Time Installation

:: ─── Require Administrator privileges ─────────────────────────────────────
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] This setup needs Administrator rights.
    echo     Right-click setup.bat and choose "Run as administrator".
    pause
    exit /b 1
)

echo.
echo =====================================================
echo   CTech SMRS ^| One-Time Setup
echo   This will install all required programs.
echo   Please stay connected to the internet.
echo   This may take 5-15 minutes.
echo =====================================================
echo.

set RESTART_NEEDED=0

:: ─── Check winget ─────────────────────────────────────────────────────────
echo [*] Checking for Windows Package Manager (winget)...
winget --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [!] winget is not available on this computer.
    echo     Please update your system via Windows Update, then re-run this setup.
    echo     (winget is included in Windows 10 1709+ and Windows 11)
    pause
    exit /b 1
)
echo     winget found. OK.
echo.

:: ─── Install Python ────────────────────────────────────────────────────────
echo [1/5] Checking Python...
python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo     Already installed: %%v
) else (
    echo     Python not found. Installing Python 3.11...
    winget install -e --id Python.Python.3.11 --silent --accept-source-agreements --accept-package-agreements
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install Python. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo     Python installed successfully.
    set RESTART_NEEDED=1
)
echo.

:: ─── Install Node.js ───────────────────────────────────────────────────────
echo [2/5] Checking Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo     Already installed: Node.js %%v
) else (
    echo     Node.js not found. Installing Node.js LTS...
    winget install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install Node.js. Check your internet connection and try again.
        pause
        exit /b 1
    )
    echo     Node.js installed successfully.
    set RESTART_NEEDED=1
)
echo.

:: ─── If Python or Node was freshly installed, PATH needs a refresh ─────────
if "%RESTART_NEEDED%"=="1" (
    echo [!] Python or Node.js was just installed.
    echo     Refreshing environment variables...
    :: Reload PATH from registry without rebooting
    for /f "usebackq skip=2 tokens=3*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul`) do set "SYS_PATH=%%A %%B"
    for /f "usebackq skip=2 tokens=3*" %%A in (`reg query "HKCU\Environment" /v PATH 2^>nul`) do set "USR_PATH=%%A %%B"
    set "PATH=!SYS_PATH!;!USR_PATH!"
    echo     Done.
    echo.
)

:: ─── Install Python backend dependencies ───────────────────────────────────
echo [3/5] Installing Python backend packages...
cd /d "%~dp0backend"
python -m pip install --upgrade pip --quiet
python -m pip install -r requirements.txt
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install backend packages.
    echo         Make sure Python was installed correctly, then re-run this setup.
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo     Backend packages installed.
echo.

:: ─── Install Node.js frontend dependencies ─────────────────────────────────
echo [4/5] Installing frontend packages...
cd /d "%~dp0frontend"
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install frontend packages.
    echo         Make sure Node.js was installed correctly, then re-run this setup.
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo     Frontend packages installed.
echo.

:: Install serve globally
echo     Installing 'serve' web server tool...
call npm install -g serve
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Could not install 'serve' globally. Will use npx serve instead.
)
echo.

:: ─── Configure Windows Firewall ────────────────────────────────────────────
echo [5/5] Configuring Windows Firewall...

:: Remove old rule if it exists, then re-add cleanly
netsh advfirewall firewall delete rule name="SMRS LAN Ports" >nul 2>&1

netsh advfirewall firewall add rule ^
    name="SMRS LAN Ports" ^
    dir=in ^
    action=allow ^
    protocol=TCP ^
    localport=3000,8000 ^
    profile=any >nul

if %ERRORLEVEL% equ 0 (
    echo     Firewall rules added for ports 3000 and 8000.
) else (
    echo [WARNING] Could not add firewall rules automatically.
    echo           You may need to add them manually (see the setup guide).
)
echo.

:: ─── Initial frontend build ────────────────────────────────────────────────
echo [*] Building the frontend for the first time...
cd /d "%~dp0frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [WARNING] Frontend build failed. start_smrs.bat will handle this when you run it.
) else (
    echo     Frontend built successfully.
)
cd /d "%~dp0"
echo.

:: ─── Done ──────────────────────────────────────────────────────────────────
echo =====================================================
echo   Setup Complete!
echo.
echo   HOW TO RUN THE SYSTEM:
echo   1. Double-click  start_smrs.bat
echo   2. Wait ~10 seconds for both windows to open
echo   3. Share the URL shown with other devices
echo.
if "%RESTART_NEEDED%"=="1" (
    echo   NOTE: A restart is recommended since new
    echo   programs were installed today.
    echo.
)
echo   You only need to run this setup ONCE.
echo   From now on, just use start_smrs.bat daily.
echo =====================================================
echo.
pause
