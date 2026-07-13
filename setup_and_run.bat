@echo off
title VideoAd Setup Installer
echo ==============================================
echo       VideoAd Auto Installer & Runner
echo ==============================================
echo.

:: 1. Install dependencies
echo [1/3] Installing node modules (production)...
call npm install --production
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm install failed. Make sure Node.js is installed.
    pause
    exit /b %errorlevel%
)
echo.

:: 2. Registry Setup (HKCU)
echo [2/3] Registering custom protocol handler (videoad://)...
reg add "HKCU\Software\Classes\videoad" /ve /t REG_SZ /d "URL:videoad Protocol" /f >nul
reg add "HKCU\Software\Classes\videoad" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCU\Software\Classes\videoad\shell" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open\command" /ve /t REG_SZ /d "\"%~dp0start_minimized.bat\" \"%%1\"" /f >nul

:: 3. Create scripts if they don't exist
echo [3/3] Setting up background execution runners...
(
echo @echo off
echo powershell -windowstyle hidden -command "Start-Process cmd -ArgumentList '/c \"%%~dp0run_server.bat\"' -WindowStyle Hidden"
) > "%~dp0start_minimized.bat"

(
echo @echo off
echo cd /d "%%~dp0"
echo npm start
) > "%~dp0run_server.bat"

echo.
echo Setup complete! Starting VideoAd Server...
echo ==============================================
start http://localhost:48774/
npm start
