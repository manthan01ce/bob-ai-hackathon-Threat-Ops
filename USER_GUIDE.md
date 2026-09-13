# 📖 PowerGrid AI — Complete User & Operator Guide

> **Predictive Outage & Equipment Failure Advisor**  
> Comprehensive guide for running, operating, and presenting the PowerGrid AI platform.

---

## 📑 Table of Contents
1. [System Overview & Architecture](#-system-overview--architecture)
2. [Prerequisites](#-prerequisites)
3. [Quick Start (One-Click Setup)](#-quick-start-one-click-setup)
4. [Manual Setup (Step-by-Step)](#-manual-setup-step-by-step)
5. [Running the Application](#-running-the-application)
6. [Navigating the Dashboard (Feature Walkthrough)](#-navigating-the-dashboard-feature-walkthrough)
7. [Judge Demonstration & Presentation Flow](#-judge-demonstration--presentation-flow)
8. [API Reference & Swagger Documentation](#-api-reference--swagger-documentation)
9. [Troubleshooting & Common Questions](#-troubleshooting--common-questions)

---

## 🏗️ System Overview & Architecture

PowerGrid AI is an enterprise decision-support platform designed for electrical utilities (GETCO, SLDC, Discoms). It predicts catastrophic transformer failures, maps transmission networks, estimates customer outage risks, and optimizes field crew positioning before outages occur.

### The Stack:
- **Frontend:** Next.js 16 (Turbopack, React 19, Tailwind CSS, Recharts, Lucide Icons)
- **Geospatial Engine:** Leaflet + MapTiler Dataviz Dark & Satellite Hybrid Vector Tiles
- **Backend API:** FastAPI (Python 3.10–3.14, SQLAlchemy ORM, Pydantic)
- **Database:** Neon Serverless PostgreSQL (Cloud-hosted, connection pooling)
- **Machine Learning:** XGBoost Regressor (Failure Probability & Health Index) + XGBoost Multi-Class Classifier (96.25% Fault Mode Accuracy)

---

## ⚙️ Prerequisites

Before launching, verify you have the following installed on your machine:

1. **Python:** Version `3.10`, `3.11`, `3.12`, `3.13`, or `3.14`  
   *Verify in terminal:* `python --version`
2. **Node.js:** Version `18.x`, `20.x`, or `22.x`  
   *Verify in terminal:* `node -v` and `npm -v`
3. **Git:**  
   *Verify in terminal:* `git --version`

---

## ⚡ Quick Start (One-Click Setup)

If you are on Windows, the repository includes automated batch scripts to get you running in seconds.

### Step 1: Clone the Repository
```bash
git clone https://github.com/manthan01ce/bob-ai-hackathon-ThreatOps.git
cd bob-ai-hackathon-ThreatOps
```

### Step 2: Run One-Click Setup
Double-click **`setup.bat`** (or run in terminal):
```powershell
.\setup.bat
```
*What this script does automatically:*
- Creates the Python virtual environment in `backend/venv`
- Upgrades `pip` and installs all dependencies from `backend/requirements.txt`
- Generates `backend/.env` from `.env.example` pre-wired to the database
- Runs `npm install` inside the `frontend` folder

### Step 3: Run One-Click Launcher
Double-click **`start.bat`** (or run in terminal):
```powershell
.\start.bat
```
*What this script does:*
- Starts the FastAPI backend at `http://localhost:8000`
- Starts the Next.js frontend at `http://localhost:3000`
- Both services launch in separate windows with live log monitoring.

---

## 🛠️ Manual Setup (Step-by-Step)

If you prefer to configure the services manually or are on macOS/Linux:

### 1. Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Command Prompt):
.\venv\Scripts\activate.bat
# macOS / Linux:
source venv/bin/activate

# 4. Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 5. Create environment file
# Windows:
copy .env.example .env
# macOS / Linux:
cp .env.example .env
```

> **Database Note:** The `.env.example` file contains a pre-configured Neon PostgreSQL connection string that is already loaded with all 836 Gujarat assets and datasets. You do not need to configure a local database!

### 2. Frontend Setup

Open a second terminal window:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node.js packages
npm install
```

---

## 🚀 Running the Application

### 1. Start the Backend API (Terminal 1)
```bash
cd backend
# Make sure venv is active
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- **Backend URL:** `http://localhost:8000`
- **Interactive Swagger Documentation:** `http://localhost:8000/docs`

### 2. Start the Frontend Dashboard (Terminal 2)
```bash
cd frontend
npm run dev
```
- **Frontend URL:** `http://localhost:3000`

Open your web browser and navigate to **`http://localhost:3000`**.

---

## 🖥️ Navigating the Dashboard (Feature Walkthrough)

The sidebar provides 8 operational control screens:

### 1. 📊 Dashboard (Overview)
- **Top KPI Cards:** Total assets (836), Critical units requiring dispatch, At-Risk assets, AI predicted 48h failures, and total customer outage risk.
- **Gujarat Grid Map:** Real-time visual map with animated glowing radar rings on Critical equipment.
- **Critical Alerts Feed:** Live outage and failure alerts with customer impact metrics.
- **Weather Risk Widget:** Live IMD weather data (rainfall, wind speed, ambient temperature) for Gujarat districts.
- **Top Risk Equipment Table:** Deduplicated ranking of high-risk transformers and substations. Click any row to focus it on the map and trend chart!
- **Telemetry Trend & Live AI Inference Card:** Shows 24-hour time-series history and the live XGBoost prediction for the selected asset.

### 2. 🗺️ Risk Map (Full-Screen GIS)
- Interactive statewide view of Gujarat.
- **Top-Right Layer Switcher:**
  - `🌑 Dark SCADA`: High-contrast control room vector theme.
  - `🛰️ Satellite Aerial`: High-resolution satellite photography showing power stations, ports, and terrain.
  - `🗺️ Highways`: Regional transit and road network.
  - `⚡ Grid Lines ON/OFF`: Toggles high-voltage 400kV/220kV transmission line corridors.
- **Equipment Shapes:**
  - ⚡ **Power Plants:** Large glowing badges (Mundra, Khavda, Kakrapar, Charanka, etc.).
  - 🔲 **Substations:** Tilted diamond badges with capacity & voltage ratings.
  - 🔘 **Transformers:** Circular nodes with risk status color coding.
- **Category Filter Chips:** Filter between `ALL (836)`, `CRITICAL`, `POWER PLANTS (12)`, `SUBSTATIONS`, and `TRANSFORMERS`.

### 3. 🗄️ Assets (Inventory Database)
- Complete searchable inventory of all 836 Gujarat facilities.
- Real-time search filter by asset code (e.g. `TR-5012`) or district (e.g. `Kutch`, `Surat`).
- Shows capacity (MVA), voltage (kV), manufacturer, and operating status.

### 4. 📈 Sensors (Telemetry Stream)
- Real-time time-series telemetry feed monitoring winding temperatures, oil temperatures, vibration velocity, and load percentages.

### 5. ⚠️ Incidents (Outage Log)
- Real outage logs showing downtime hours, fault duration, weather conditions, and root causes (insulation breakdown, lightning trip, overload).

### 6. 🤖 AI Predictions (Judge Testing Studio)
- **Model Evaluation Card:** Displays model accuracy (**96.25%**), RMSE (`0.0797`), and top SHAP feature drivers.
- **Scenario Presets for Demos:**
  1. *Safe Operation*
  2. *Arcing / Breakdown (Acetylene Spike)*
  3. *Severe Thermal Overheating (Oil Temp >90°C)*
  4. *Mechanical Strain (Vibration >6 mm/s)*
- **Live Sliders:** Adjust temperature, vibration, load, and DGA gases ($C_2H_2, C_2H_4, H_2, CH_4$) on the fly.
- **"Run Live XGBoost AI Inference" Button:** Runs immediate machine learning inference and outputs classified fault modes, failure probabilities, and automated mitigation steps.

### 7. 👷 Crew Planning
- 12 Gujarat Field Teams across 6 operational zones (Ahmedabad, Surat, Vadodara, Rajkot, Gandhinagar).
- Status toggles (`Available` vs `Dispatched`) and skill specializations.

### 8. 🔔 Alerts
- Emergency queue with quick action buttons to *"Focus on Map"* or *"Dispatch Crew"*.

---

## 🏆 Judge Demonstration & Presentation Flow

Follow this 5-minute flow to deliver a winning hackathon demonstration:

1. **The Hook (1 minute):**
   - *"Power outages cost Indian industries over ₹25,000 Crores annually. Replacing a failed power transformer takes 6 to 12 months. PowerGrid AI moves utilities from reactive repairs to predictive prevention."*
2. **Statewide Scope (1 minute):**
   - Open the **Risk Map**. Switch to **Satellite Aerial** mode.
   - Point out that the platform monitors **836 assets across all 33 districts of Gujarat**, including major landmarks like **Khavda Solar/Wind Park (30,000 MW)**, **Mundra Thermal**, and **Kakrapar Nuclear**.
   - Toggle **Grid Lines: ON** to showcase the simulated GETCO transmission corridors.
3. **Live Equipment Triage (1 minute):**
   - Filter by **`CRITICAL`**.
   - Click on a pulsing red transformer (e.g. `TR-1124` or `SS-2216`).
   - Show how the telemetry trend updates in real time with winding temperature, vibration, and risk trajectory.
4. **The AI Testing Studio (1.5 minutes) — *The Climax*:**
   - Switch to the **"AI Predictions"** tab.
   - Explain the XGBoost model architecture (**96.25% test accuracy** across 6 fault modes).
   - Click **"2. Arcing / Breakdown"**. Show how an Acetylene spike instantly triggers an *Arcing / Partial Discharge* diagnosis.
   - **Invite the Judge:** *"Give me any custom temperature or gas reading."* Drag the sliders to their numbers, click **"Run Live XGBoost AI Inference"**, and watch the model evaluate live on the spot.
5. **Actionable Resolution (30 seconds):**
   - Switch to **Crew Planning**. Show how the platform automatically matches the fault diagnosis to the nearest available crew in that Gujarat zone.

---

## 📡 API Reference & Swagger Documentation

The FastAPI backend exposes an interactive OpenAPI Swagger interface at **`http://localhost:8000/docs`**.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Overall KPI summary (total assets, critical count, customers at risk) |
| `GET` | `/api/dashboard/risk-map` | Coordinates, risk scores, and types for all 836 assets |
| `GET` | `/api/dashboard/top-risk` | Deduplicated list of highest risk equipment |
| `GET` | `/api/assets/?limit=100` | Asset inventory with capacity & voltage specifications |
| `GET` | `/api/weather/risk` | Live IMD weather data across Gujarat districts |
| `GET` | `/api/crews/` | 12 field crew teams and availability statuses |
| `GET` | `/api/predictions/live/{asset_id}` | Live XGBoost inference on an asset's latest database telemetry |
| `POST` | `/api/predictions/predict` | On-demand ML inference on custom sensor/DGA inputs |
| `GET` | `/api/predictions/model-info` | Model metadata, feature weights, and evaluation metrics |

---

## ❓ Troubleshooting & Common Questions

#### 1. "Port 8000 or Port 3000 is already in use"
- **Fix:** In PowerShell, terminate existing processes:
  ```powershell
  Get-Process node, python -ErrorAction SilentlyContinue | Stop-Process -Force
  ```
  Then rerun `start.bat`.

#### 2. "Map container is already initialized"
- **Status:** **Fixed.** The Leaflet initialization lifecycle in `GridMap.tsx` automatically destroys any stale instances and resets container IDs.

#### 3. "Failed to fetch summary"
- **Cause:** The backend is not running.
- **Fix:** Ensure Terminal 1 is running `uvicorn app.main:app --port 8000` and displays `Application startup complete`.

#### 4. How to re-train the XGBoost model:
- Run:
  ```bash
  cd backend
  .\venv\Scripts\activate
  python -m app.ml.train
  ```
  The trained model artifacts will be saved to `backend/app/ml/artifacts/`.

---

*Developed for the Bob AI Hackathon &bull; PowerGrid AI Decision Support Platform*
