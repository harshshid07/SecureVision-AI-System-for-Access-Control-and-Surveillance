@echo off
echo ================================================
echo SecureVision - Starting Application
echo ================================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo [ERROR] Virtual environment not found
    echo Please run 'setup.bat' first
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found
    echo Using default configuration...
    echo Please copy .env.example to .env and configure your settings
    echo.
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Starting SecureVision application...
echo Application will be available at: http://localhost:5000
echo Press Ctrl+C to stop the server
echo.

python app.py

pause
