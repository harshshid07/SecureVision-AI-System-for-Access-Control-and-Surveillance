@echo off
REM ==============================================================
REM SecureVision Complete System Launcher
REM Starts Backend + Frontend + Kiosk in one command
REM ==============================================================

color 0A
title SecureVision System Launcher

echo.
echo ================================================================
echo                    SECUREVISION SYSTEM LAUNCHER
echo ================================================================
echo.
echo This will start:
echo   1. Backend (FastAPI) - http://localhost:8000
echo   2. Frontend (React) - http://localhost:5173
echo   3. Kiosk (PyQt5) - Full-screen secure browser
echo.
echo ================================================================
echo.

REM Set base directory
set BASE_DIR=%~dp0..
cd /d "%BASE_DIR%"

REM ===========================================
REM Step 1: Start Backend
REM ===========================================
echo [1/3] Starting Backend Server...
echo.

REM Check if backend virtual environment exists
if not exist "backend\venv\Scripts\python.exe" (
    echo ERROR: Backend virtual environment not found!
    echo Please run setup first:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

REM Start backend in new window
start "SecureVision Backend" cmd /k "cd /d "%BASE_DIR%\backend" && venv\Scripts\python.exe main.py"

echo ✓ Backend starting in separate window...
echo   Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak > nul

REM ===========================================
REM Step 2: Start Frontend
REM ===========================================
echo.
echo [2/3] Starting Frontend Server...
echo.

REM Check if node_modules exists
if not exist "frontend\node_modules\" (
    echo ERROR: Frontend dependencies not installed!
    echo Please run:
    echo   cd frontend
    echo   npm install
    pause
    exit /b 1
)

REM Start frontend in new window
start "SecureVision Frontend" cmd /k "cd /d "%BASE_DIR%\frontend" && npm run dev"

echo ✓ Frontend starting in separate window...
echo   Waiting 10 seconds for frontend to build...
timeout /t 10 /nobreak > nul

REM ===========================================
REM Step 3: Launch Kiosk
REM ===========================================
echo.
echo [3/3] Launching Kiosk Browser...
echo.

REM Check if kiosk venv exists
if not exist "kiosk\venv\Scripts\python.exe" (
    echo ERROR: Kiosk virtual environment not found!
    echo Please run:
    echo   cd kiosk
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install PyQt5==5.15.10 PyQtWebEngine==5.15.6
    pause
    exit /b 1
)

echo ✓ All services ready!
echo.
echo ================================================================
echo                    SYSTEM READY - LAUNCHING KIOSK
echo ================================================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   Kiosk:    Full-screen mode
echo.
echo   Press Ctrl+K inside the kiosk to exit
echo.
echo ================================================================
echo.
timeout /t 3 /nobreak > nul

REM Launch kiosk (this will take over the screen)
cd /d "%BASE_DIR%\kiosk"
venv\Scripts\python.exe main_pyqt5.py

REM ===========================================
REM Cleanup after kiosk exits
REM ===========================================
echo.
echo ================================================================
echo                    KIOSK CLOSED - CLEANUP
echo ================================================================
echo.
echo Kiosk has been closed.
echo.
echo Backend and Frontend are still running in separate windows.
echo Close those windows manually if needed.
echo.
pause
