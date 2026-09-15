# Setup Guide — Running PowerGrid Ai Locally

This guide provides exact steps to install and run the **ThreatOps** project on a local machine for testing and evaluation.

---

## 📋 Prerequisites

Ensure the following tools are installed on your environment:
- **Python 3.10+ to 3.14** ([python.org](https://www.python.org/))
- **Node.js 18+ or 20+** ([nodejs.org](https://nodejs.org/))
- **Git** ([git-scm.com](https://git-scm.com/))

---

## 🔑 Environment Variables (`.env`)

The project uses `.env` files located inside `src/backend/` and `src/frontend/`.

### Backend `.env.example`
```env
DATABASE_URL=postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
SECRET_KEY=your_secret_key_here
MAPTILER_API_KEY=your_maptiler_key_optional
```

*(Note: Pre-configured default Neon Postgres credentials are provided in `src/.env.example` for immediate out-of-the-box operation).*

---

## ⚡ Quickstart Option 1: Automated Windows Scripts (Recommended)

1. Open a terminal in `src/` directory.
2. Run setup script:
   ```cmd
   setup.bat
   ```
   *This automatically creates the Python `venv`, installs backend dependencies from `requirements.txt`, copies `.env.example`, and runs `npm install` in frontend.*
3. Launch the application:
   ```cmd
   start.bat
   ```
   *Launches FastAPI backend at `http://localhost:8000` and Next.js frontend at `http://localhost:3000`.*

---

## 🛠️ Quickstart Option 2: Manual Terminal Execution

### 1. Backend Setup (Python FastAPI)

```bash
cd src/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
# source venv/bin/activate

# Install requirements
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment variables template
cp .env.example .env

# Start FastAPI server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

- Backend API: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup (Next.js)

Open a new terminal:

```bash
cd src/frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

- Web Dashboard UI: `http://localhost:3000`

---

## 🔍 Verification & Testing

1. Open `http://localhost:3000` in your web browser.
2. Verify that KPI summary cards and Gujarat map load with 836+ assets.
3. Navigate to the **"AI Predictions"** tab.
4. Click the **"2. Critical Arcing & Breakdown"** preset button and click **"Run Live XGBoost AI Inference"**.
5. Confirm that the AI model outputs *Arcing / Partial Discharge* diagnosis with SHAP feature attributions.

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `ModuleNotFoundError` | Python venv not activated | Ensure `.\venv\Scripts\activate` was run before starting Uvicorn |
| `DATABASE_URL connection error` | Network firewall or invalid URI | Verify internet connection for Neon Serverless Postgres or update `DATABASE_URL` in `src/backend/.env` |
| `npm command not found` | Node.js not installed | Download and install Node.js 18+ from nodejs.org |

---

## 🌐 Cloud Deployment Options

- **Render.com 1-Click Deployment:** See [`docs/render-deployment-guide.md`](render-deployment-guide.md) for 1-Click Blueprint deployment using `render.yaml`.
- **Vercel Serverless Deployment:** Native Vercel deployment supported out-of-the-box via `vercel.json`.

