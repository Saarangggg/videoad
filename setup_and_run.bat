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

title VideoAd Local Setup Installer
echo ==============================================
echo       VideoAd Auto Installer ^& Runner
echo ==============================================
echo.

:: 1. Check for Node.js
echo Checking for Node.js...
node -v >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/ before running this setup.
    echo.
    pause
    exit /b
)
echo [OK] Node.js is installed.
echo.

:: 2. Check and stop any currently running VideoAd process
echo Checking if VideoAd is currently running...
powershell -ExecutionPolicy Bypass -Command "$p = Get-NetTCPConnection -LocalPort 48774 -ErrorAction SilentlyContinue; if ($p) { Stop-Process -Id $p.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo.

:: 3. Create destination directory and copy local files
echo Creating destination folder at %SystemDrive%\VideoAd...
if not exist "%SystemDrive%\VideoAd" mkdir "%SystemDrive%\VideoAd"
echo Copying files to %SystemDrive%\VideoAd...
xcopy /s /e /y /q "%~dp0*" "%SystemDrive%\VideoAd\" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy codebase files to %SystemDrive%\VideoAd.
    pause
    exit /b
)
echo.

:: 4. Check & Download yt-dlp
echo Checking/Downloading yt-dlp...
if not exist "%SystemDrive%\VideoAd\yt-dlp.exe" (
    powershell -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile '%SystemDrive%\VideoAd\yt-dlp.exe' -UseBasicParsing"
)
if not exist "%SystemDrive%\VideoAd\yt-dlp.exe" (
    echo ERROR: Failed to download yt-dlp.exe.
    pause
    exit /b
)
echo [OK] yt-dlp is ready.
echo.

:: 5. Check & Download FFMPEG
echo Checking/Downloading FFMPEG...
if not exist "%SystemDrive%\VideoAd\ffmpeg.exe" (
    powershell -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip' -OutFile '%SystemDrive%\VideoAd\ffmpeg.zip' -UseBasicParsing"
    powershell -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%SystemDrive%\VideoAd\ffmpeg.zip' -DestinationPath '%SystemDrive%\VideoAd' -Force"
    del "%SystemDrive%\VideoAd\ffmpeg.zip"
)
if not exist "%SystemDrive%\VideoAd\ffmpeg.exe" (
    echo ERROR: Failed to download or extract ffmpeg.exe.
    pause
    exit /b
)
echo [OK] FFMPEG is ready.
echo.

:: 6. Install node dependencies
echo Installing production node dependencies...
set "PATH=%SystemDrive%\Program Files\nodejs;%SystemDrive%\Program Files (x86)\nodejs;%USERPROFILE%\AppData\Roaming\npm;%PATH%"
cd /d "%SystemDrive%\VideoAd"
call npm install --production
if errorlevel 1 (
    echo ERROR: npm install failed! Please check your internet connection or Node.js installation.
    pause
    exit /b
)
echo.

:: 7. Create silent runner files
echo Setting up silent background execution runners...
echo @echo off > "%SystemDrive%\VideoAd\run_server.bat"
echo cd /d "%SystemDrive%\VideoAd" >> "%SystemDrive%\VideoAd\run_server.bat"
echo set PATH=%SystemDrive%\VideoAd;%%PATH%% >> "%SystemDrive%\VideoAd\run_server.bat"
echo netstat -ano ^| findstr LISTENING ^| findstr :48774 ^> nul >> "%SystemDrive%\VideoAd\run_server.bat"
echo if %%errorlevel%% equ 0 ^( >> "%SystemDrive%\VideoAd\run_server.bat"
echo     start "" "http://localhost:48774" >> "%SystemDrive%\VideoAd\run_server.bat"
echo     exit >> "%SystemDrive%\VideoAd\run_server.bat"
echo ^) >> "%SystemDrive%\VideoAd\run_server.bat"
echo start "" "http://localhost:48774" >> "%SystemDrive%\VideoAd\run_server.bat"
echo node server.js >> "%SystemDrive%\VideoAd\run_server.bat"

echo Set WshShell = CreateObject^("WScript.Shell"^) > "%SystemDrive%\VideoAd\launch_server.vbs"
echo WshShell.Run "cmd /c %SystemDrive%\VideoAd\run_server.bat", 0, false >> "%SystemDrive%\VideoAd\launch_server.vbs"

:: 8. Registry Setup for custom protocol (videoad://)
echo Registering custom protocol handler (videoad://)...
reg add "HKCU\Software\Classes\videoad" /ve /t REG_SZ /d "URL:videoad Protocol" /f >nul
reg add "HKCU\Software\Classes\videoad" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCU\Software\Classes\videoad\shell" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open\command" /ve /t REG_SZ /d "wscript.exe \"%SystemDrive%\VideoAd\launch_server.vbs\"" /f >nul

:: 9. Create Desktop shortcut
echo Creating Desktop shortcut...
powershell -ExecutionPolicy Bypass -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\VideoAd Downloader.lnk'); $Shortcut.TargetPath = 'wscript.exe'; $Shortcut.Arguments = '\"%SystemDrive%\VideoAd\launch_server.vbs\"'; $Shortcut.IconLocation = 'shell32.dll,238'; $Shortcut.WorkingDirectory = '%SystemDrive%\VideoAd'; $Shortcut.Save()"

echo ==============================================
echo Setup complete!
echo VideoAd Downloader is now installed in %SystemDrive%\VideoAd
echo.
echo Launching server silently in background...
wscript.exe "%SystemDrive%\VideoAd\launch_server.vbs"
echo ==============================================
echo Press any key to exit this installer...
pause >nul
exit /b
