@echo off
REM SecureVision Kiosk Launcher
REM This script activates the virtual environment and runs the kiosk

echo ============================================================
echo SecureVision Safe Kiosk Launcher
echo ============================================================
echo.

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    echo Then run: venv\Scripts\activate.bat
    echo Then run: pip install PyQt5==5.15.10 PyQtWebEngine==5.15.6
    pause
    exit /b 1
)

REM Activate virtual environment and run kiosk
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Starting SecureVision Kiosk...
echo.
echo Press Ctrl+K to exit the kiosk
echo.

python main_pyqt5.py

echo.
echo Kiosk closed.
pause
