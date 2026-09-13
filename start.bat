@echo off
echo =========================================================
echo   Starting PowerGrid AI (FastAPI + Next.js)
echo =========================================================

echo Starting FastAPI Backend on http://localhost:8000 ...
start "PowerGrid AI - Backend API" cmd /k "cd backend && venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

echo Starting Next.js Frontend on http://localhost:3000 ...
start "PowerGrid AI - Frontend Dashboard" cmd /k "cd frontend && npm run dev"

echo =========================================================
echo Both services are starting!
echo Frontend: http://localhost:3000
echo Backend API Docs: http://localhost:8000/docs
echo =========================================================
