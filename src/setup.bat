@echo off
echo =========================================================
echo   PowerGrid AI - One-Click Environment Setup
echo =========================================================

echo [1/4] Setting up Python virtual environment...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/4] Installing Python backend dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo [3/4] Checking .env configuration...
if not exist .env (
    copy .env.example .env
    echo Created backend/.env from .env.example
)

echo [4/4] Installing Next.js frontend dependencies...
cd ..\frontend
call npm install

echo =========================================================
echo   SETUP COMPLETE! Run 'start.bat' to launch the project.
echo =========================================================
pause
