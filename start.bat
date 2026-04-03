@echo off
REM GSPy Web UI - Quick Start Script (Windows)
REM Starts both backend and frontend

setlocal enabledelayedexpansion

echo.
echo 🚀 GSPy Web UI - Starting Full Stack
echo =====================================
echo.

REM Check if we're in the right directory
if not exist "SETUP.md" (
    echo ❌ Error: Please run this script from the Aero directory
    pause
    exit /b 1
)

REM Install backend dependencies
echo 📦 Checking backend dependencies...
if not exist "backend\venv" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    cd ..
)

REM Install frontend dependencies
echo 📦 Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Start backend in new window
echo ✅ Starting Backend (port 8000)...
start cmd /k "cd backend && venv\Scripts\activate.bat && python main.py"

REM Wait a bit for backend to start
timeout /t 2 /nobreak

REM Start frontend in new window
echo ✅ Starting Frontend (port 5173)...
start cmd /k "cd frontend && npm run dev"

echo.
echo 🎉 Full Stack Started!
echo ========================================
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.
echo Close the windows to stop the services
pause
