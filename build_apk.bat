@echo off
echo ===================================================
echo   SuperBass - Flutter Release APK Build Script
echo ===================================================
echo.

REM 1. Get the project root directory
set "REPO_DIR=%~dp0"
if "%REPO_DIR:~-1%"=="\" set "REPO_DIR=%REPO_DIR:~0,-1%"

REM 2. Unmount X: if already mounted, then mount to clean virtual drive
subst X: /d >nul 2>&1
subst X: "%REPO_DIR%"
if errorlevel 1 (
    echo [ERROR] Failed to mount virtual drive X:.
    pause
    exit /b 1
)

echo [1/3] Navigating to X:\App...
cd /d X:\App

echo [2/3] Building Release APK with .env configuration...
call C:\flutter\bin\flutter.bat build apk --dart-define-from-file=.env --no-tree-shake-icons

if errorlevel 1 (
    echo.
    echo [ERROR] APK Build failed! Check the output above.
    cd /d "%REPO_DIR%"
    subst X: /d >nul 2>&1
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning up virtual drive...
cd /d "%REPO_DIR%"
subst X: /d >nul 2>&1

echo.
echo ===================================================
echo [SUCCESS] APK Build Completed Successfully!
echo APK Location:
echo %REPO_DIR%\App\build\app\outputs\flutter-apk\app-release.apk
echo ===================================================
echo.
pause
