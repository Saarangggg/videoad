@echo off
fltmc >nul 2>&1
if errorlevel 1 (
    echo Requesting Administrator privileges...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "cmd.exe", "/k """ ^& "%~f0" ^& """", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%SystemRoot%\System32\wscript.exe" "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /b
)
cd /d "%~dp0"

title VideoAd Uninstaller
echo ==============================================
echo       VideoAd Auto Uninstaller
echo ==============================================
echo.

:: 1. Stop background server
echo Stopping background VideoAd server...
powershell -ExecutionPolicy Bypass -Command "$p = Get-NetTCPConnection -LocalPort 48774 -ErrorAction SilentlyContinue; if ($p) { Stop-Process -Id $p.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo [OK] Background processes stopped.
echo.

:: 2. Remove Registry custom protocol
echo Removing custom protocol handler (videoad://)...
reg delete "HKCU\Software\Classes\videoad" /f >nul 2>&1
echo [OK] Custom protocol removed.
echo.

:: 3. Remove Desktop shortcut
echo Removing Desktop shortcut...
if exist "%USERPROFILE%\Desktop\VideoAd Downloader.lnk" (
    del "%USERPROFILE%\Desktop\VideoAd Downloader.lnk"
)
echo [OK] Desktop shortcut removed.
echo.

:: 4. Delete Installation directory
echo Removing installation folder at %SystemDrive%\VideoAd...
if exist "%SystemDrive%\VideoAd" (
    rmdir /s /q "%SystemDrive%\VideoAd"
)
echo [OK] Installation folder deleted.
echo.

echo ==============================================
echo Uninstall complete!
echo VideoAd has been completely removed from your system.
echo ==============================================
echo Press any key to exit...
pause >nul
exit /b
