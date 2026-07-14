@echo off
:: Check for Admin rights using fltmc (standard filter manager tool check)
fltmc >nul 2>&1
if errorlevel 1 (
    echo Requesting Administrator privileges (keeping window open for debugging)...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "cmd.exe", "/k """ ^& "%~f0" ^& """", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%SystemRoot%\System32\wscript.exe" "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /b
)
cd /d "%~dp0"

echo ==============================================
echo       VideoAd Installer Debugger
echo ==============================================
echo.
echo [1] Elevated successfully!
echo Current Working Directory: %cd%
echo Script Path: %~f0
echo.

echo [2] Testing Node.js presence...
node -v
if errorlevel 1 (
    echo [ERROR] node is not found in the administrator's path.
) else (
    echo [OK] node is available.
)
echo.

echo [3] Testing npm presence...
call npm -v
if errorlevel 1 (
    echo [ERROR] npm is not found in the administrator's path.
) else (
    echo [OK] npm is available.
)
echo.

echo [4] Testing target directory creation...
if not exist "%SystemDrive%\VideoAd" (
    mkdir "%SystemDrive%\VideoAd"
    if errorlevel 1 (
        echo [ERROR] Failed to create folder %SystemDrive%\VideoAd
    ) else (
        echo [OK] Created %SystemDrive%\VideoAd folder.
    )
) else (
    echo [OK] %SystemDrive%\VideoAd folder already exists.
)
echo.

echo [5] System environment PATH:
echo %PATH%
echo.
echo ==============================================
echo Debug checks finished. The window remains open.
pause
