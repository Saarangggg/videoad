@echo off
title VideoAd Setup Installer
echo ==============================================
echo       VideoAd Auto Installer & Runner
echo ==============================================
echo.

:: Prepend current directory to PATH so local binaries are preferred
set PATH=%~dp0;%PATH%

:: 1. Check & Download yt-dlp
echo Checking for yt-dlp...
where yt-dlp >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] yt-dlp is installed on system PATH.
) else (
    if exist "%~dp0yt-dlp.exe" (
        echo [OK] yt-dlp detected in project folder.
    ) else (
        echo yt-dlp is missing! Downloading standalone yt-dlp.exe binary for Windows...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile '%~dp0yt-dlp.exe'"
        if exist "%~dp0yt-dlp.exe" (
            echo [OK] yt-dlp downloaded successfully.
        ) else (
            echo WARNING: Failed to download yt-dlp. Downloads might fail.
        )
    )
)
echo.

:: 2. Check & Download FFMPEG
echo Checking for FFMPEG...
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] FFMPEG is installed on system PATH.
) else (
    if exist "%~dp0ffmpeg.exe" (
        echo [OK] FFMPEG detected in project folder.
    ) else (
        echo FFMPEG is missing! Downloading standalone FFMPEG static binary for Windows...
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/ffbinaries/ffbinaries-prebuilt/releases/download/v4.4.1/ffmpeg-4.4.1-win-64.zip' -OutFile '%~dp0ffmpeg.zip'"
        echo Extracting FFMPEG...
        powershell -Command "Expand-Archive -Path '%~dp0ffmpeg.zip' -DestinationPath '%~dp0' -Force"
        del "%~dp0ffmpeg.zip"
        if exist "%~dp0ffmpeg.exe" (
            echo [OK] FFMPEG downloaded and extracted successfully.
        ) else (
            echo WARNING: Failed to extract FFMPEG.
        )
    )
)
echo.

:: 3. Install Node.js dependencies
echo Installing node modules (production)...
call npm install --production
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm install failed. Make sure Node.js is installed.
    pause
    exit /b %errorlevel%
)
echo.

:: 4. Registry Setup (HKCU)
echo Registering custom protocol handler (videoad://)...
reg add "HKCU\Software\Classes\videoad" /ve /t REG_SZ /d "URL:videoad Protocol" /f >nul
reg add "HKCU\Software\Classes\videoad" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCU\Software\Classes\videoad\shell" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open" /f >nul
reg add "HKCU\Software\Classes\videoad\shell\open\command" /ve /t REG_SZ /d "\"%~dp0start_minimized.bat\" \"%%1\"" /f >nul

:: 5. Create background runner scripts
echo Setting up background execution runners...
(
echo @echo off
echo powershell -windowstyle hidden -command "Start-Process cmd -ArgumentList '/c \"%%~dp0run_server.bat\"' -WindowStyle Hidden"
) > "%~dp0start_minimized.bat"

(
echo @echo off
echo cd /d "%%~dp0"
echo set PATH=%%~dp0;%%PATH%%
echo npm start
) > "%~dp0run_server.bat"

echo.
echo Setup complete! Starting VideoAd Server...
echo ==============================================
start http://localhost:48774/
npm start
