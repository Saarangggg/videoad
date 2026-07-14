@echo off
:: Check for Admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting Administrator privileges...
    set "SCRIPT_PATH=%~f0"
    powershell -Command "Start-Process -FilePath $env:SCRIPT_PATH -Verb RunAs"
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
if %errorLevel% neq 0 (
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
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :48774 ^| findstr LISTENING') do (
    echo Stopping currently running VideoAd process (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)
echo.

:: 3. Create destination directory and copy local files
echo Creating destination folder at C:\VideoAd...
if not exist "C:\VideoAd" mkdir "C:\VideoAd"
echo Copying files to C:\VideoAd...
xcopy /s /e /y /q "%~dp0*" "C:\VideoAd\" >nul
if %errorLevel% neq 0 (
    echo ERROR: Failed to copy codebase files to C:\VideoAd.
    pause
    exit /b
)
echo.

:: 4. Check & Download yt-dlp
echo Checking/Downloading yt-dlp...
if not exist "C:\VideoAd\yt-dlp.exe" (
    powershell -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'C:\VideoAd\yt-dlp.exe' -UseBasicParsing"
)
if not exist "C:\VideoAd\yt-dlp.exe" (
    echo ERROR: Failed to download yt-dlp.exe.
    pause
    exit /b
)
echo [OK] yt-dlp is ready.
echo.

:: 5. Check & Download FFMPEG
echo Checking/Downloading FFMPEG...
if not exist "C:\VideoAd\ffmpeg.exe" (
    powershell -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip' -OutFile 'C:\VideoAd\ffmpeg.zip' -UseBasicParsing"
    powershell -ExecutionPolicy Bypass -Command "Expand-Archive -Path 'C:\VideoAd\ffmpeg.zip' -DestinationPath 'C:\VideoAd' -Force"
    del "C:\VideoAd\ffmpeg.zip"
)
if not exist "C:\VideoAd\ffmpeg.exe" (
    echo ERROR: Failed to download or extract ffmpeg.exe.
    pause
    exit /b
)
echo [OK] FFMPEG is ready.
echo.

:: 6. Install node dependencies
echo Installing production node dependencies...
set "PATH=C:\Program Files\nodejs;%USERPROFILE%\AppData\Roaming\npm;%PATH%"
cd /d "C:\VideoAd"
call npm install --production
if %errorLevel% neq 0 (
    echo ERROR: npm install failed! Please check your internet connection or Node.js installation.
    pause
    exit /b
)
echo.

:: 7. Create silent runner files in C:\VideoAd
echo Setting up silent background execution runners...
(
echo @echo off
echo cd /d "C:\VideoAd"
echo set PATH=C:\VideoAd;%%PATH%%
echo netstat -ano ^| findstr LISTENING ^| findstr :48774 ^> nul
echo if %%errorlevel%% equ 0 ^(
echo     start "" "http://localhost:48774"
echo     exit
echo ^)
echo start "" "http://localhost:48774"
echo node server.js
) > "C:\VideoAd\run_server.bat"

(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "cmd /c C:\VideoAd\run_server.bat", 0, false
) > "C:\VideoAd\launch_server.vbs"

:: 8. Registry Setup for custom protocol (videoad://)
echo Registering custom protocol handler (videoad://)...
reg add "HKCU\Software\Classes\videoad" /ve /t REG_SZ /d "URL:videoad Protocol" /f >nul
reg add "HKCU\Software\Classes\videoad" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCU\Software\Classes\videoad\shell" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open\command" /ve /t REG_SZ /d "wscript.exe \"C:\VideoAd\launch_server.vbs\"" /f >nul

:: 9. Create Desktop shortcut
echo Creating Desktop shortcut...
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('$env:USERPROFILE\Desktop\VideoAd Downloader.lnk'); $Shortcut.TargetPath = 'wscript.exe'; $Shortcut.Arguments = '\"C:\VideoAd\launch_server.vbs\"'; $Shortcut.IconLocation = 'shell32.dll,238'; $Shortcut.WorkingDirectory = 'C:\VideoAd'; $Shortcut.Save()"

echo ==============================================
echo Setup complete!
echo VideoAd Downloader is now installed in C:\VideoAd
echo.
echo Launching server silently in background...
wscript.exe "C:\VideoAd\launch_server.vbs"
echo ==============================================
echo Press any key to exit this installer...
pause >nul
exit /b
