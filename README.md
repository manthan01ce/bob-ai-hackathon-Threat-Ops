# ⚡ PowerGrid AI — Predictive Outage & Equipment Failure Advisor

> **Predict. Prevent. Keep the Grid On.**  
> An AI-powered decision-support platform for modern electrical grids that predicts equipment failures, estimates customer outage impacts, maps high-voltage transmission networks, and automates field crew dispatch before an outage occurs.

---

## 🌟 Key Features

- **🗺️ Interactive Gujarat Grid Map (836+ Assets across all 33 Districts):**
  - **12 Real Power Generation Stations:** Mundra Thermal (4,620 MW), Khavda Hybrid Solar/Wind (30,000 MW), Kakrapar Nuclear (1,400 MW), Charanka Solar (600 MW), Ukai Hydro, Gandhinagar GSECL, Wanakbori, Sardar Sarovar, etc.
  - **GETCO High-Voltage Substations & Distribution Transformers** mapped to authentic GPS coordinates with animated 400kV/220kV transmission line corridors.
  - **MapTiler Layer Switcher:** Toggle between **🌑 Dark SCADA**, **🛰️ Satellite Aerial**, and **🗺️ Highway Grid** views.
  - **Real-Time Visual Indicators:** Pulsing red radar circles on Critical risk nodes, tilted diamond badges for substations, and hexagonal badges for power generation stations.

- **🤖 Machine Learning Failure Engine (XGBoost):**
  - Trained on Dissolved Gas Analysis (DGA) chemistry ($C_2H_2, C_2H_4, CH_4, H_2, CO, CO_2$), IEC 60599 Rogers Ratios, dielectric oil rigidity, winding temperatures, and operational vibration/load.
  - **96.25% Multi-Class Fault Classification Accuracy:** Diagnoses *Arcing / Partial Discharge*, *Thermal Overheating*, *Insulation Degradation*, *Dielectric Breakdown*, and *Mechanical Strain*.
  - **Failure Probability & Health Index Scoring (0–100):** Predicts risk horizon windows (`6h`, `24h`, `48h`, `7d`).

- **🧪 Interactive AI Testing Studio (For Judges & Operators):**
  - Live sensor sliders to input or simulate arbitrary operational telemetry on the fly.
  - 4 instant one-click demonstration presets:
    1. *Normal Safe Operation* ($48^\circ\text{C}$, low gas)
    2. *Critical Arcing & Breakdown* ($C_2H_2 = 38\text{ ppm}$, partial discharge)
    3. *Severe Thermal Overheating* ($98^\circ\text{C}$ oil temp, $118\%$ load)
    4. *High Vibration Mechanical Strain* ($6.8\text{ mm/s}$)
  - Real-time inference output with SHAP feature importance attribution and automated crew dispatch recommendations.

- **👥 Automated Field Crew Dispatch:**
  - 12 Gujarat field crews across 6 operational zones (Ahmedabad North/South, Surat, Vadodara, Rajkot, Gandhinagar) with skill-level tracking (Substation Engineers, Senior Linemen, Specialists).

---

## 📂 Project Architecture

```
ThreatOps/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI REST endpoints (assets, sensors, weather, incidents, predictions, crews)
│   │   ├── db/              # SQLAlchemy session & Neon Postgres engine
│   │   ├── ml/              # Model training pipeline & serialized XGBoost artifacts (.joblib)
│   │   ├── models/          # 9 Relational Database ORM schemas
│   │   └── services/        # Real-time ML inference service (ml_service.py)
│   ├── scripts/             # Data ingestion & statewide grid expansion scripts
│   ├── requirements.txt     # Pinned Python dependencies
│   └── .env.example         # Template for database & API credentials
│
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 16 App Router (page.tsx - Multi-tab dashboard)
│   │   ├── components/      # Leaflet + MapTiler GridMap component
│   │   └── lib/             # API client methods (api.ts)
│   ├── package.json         # Node.js dependencies
│   └── tsconfig.json
│
├── setup.bat                # One-click Windows setup script
├── start.bat                # One-click dual-server launcher
├── .gitignore               # Clean Git ignore rules
└── README.md                # Comprehensive documentation
```

---

## 📋 Prerequisites

Before running the project, ensure you have:
- **Python 3.10 to 3.14** installed ([python.org](https://www.python.org/downloads/))
- **Node.js 18+ or 20+** installed ([nodejs.org](https://nodejs.org/))
- **Git** installed ([git-scm.com](https://git-scm.com/))

---

## 🚀 Quickstart Guide (After Cloning the Repository)

### **Option 1: One-Click Windows Setup (Recommended)**

1. Open the cloned `ThreatOps` folder.
2. Double-click **`setup.bat`**:
   - Creates the Python virtual environment.
   - Installs all backend dependencies (`requirements.txt`).
   - Copies `.env.example` to `.env`.
   - Installs all frontend dependencies (`npm install`).
3. Double-click **`start.bat`**:
   - Launches the FastAPI backend on `http://localhost:8000`.
   - Launches the Next.js frontend on `http://localhost:3000`.

---

### **Option 2: Manual Terminal Setup**

#### **Step 1: Clone the Repository**
```bash
git clone https://github.com/your-username/ThreatOps.git
cd ThreatOps
```

#### **Step 2: Setup the Python Backend**
```bash
cd backend

# Create & activate virtual environment
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# Linux / macOS:
# python3 -m venv venv
# source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

> **Note:** The included `.env.example` pre-connects to the live Neon Serverless Postgres database. If you wish to use your own database, update `DATABASE_URL` in `backend/.env`.

#### **Step 3: Setup the Next.js Frontend**
Open a new terminal window:
```bash
cd frontend
npm install
```

#### **Step 4: Start Both Services**

**Terminal 1 — Backend (FastAPI):**
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
*Backend runs on: [http://localhost:8000](http://localhost:8000)*  
*Interactive Swagger API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)*

**Terminal 2 — Frontend (Next.js):**
```bash
cd frontend
npm run dev
```
*Frontend runs on: [http://localhost:3000](http://localhost:3000)*

---

## 🧑‍⚖️ Judge Demonstration Walkthrough

To present this project to judges or stakeholders, follow this recommended walkthrough:

1. **Dashboard Overview (`http://localhost:3000`):**
   - Show the **Real-Time Telemetry Heartbeat** badge in the header (polls every 15s).
   - Point out the 5 KPI summary cards covering **836 assets across all 33 Gujarat districts**.

2. **The Grid Map & Layer Switcher:**
   - Click **"Satellite Aerial"** in the top-right of the map to see real satellite imagery of Gujarat.
   - Toggle **"⚡ Grid Lines: ON"** to display the 400kV/220kV transmission interconnect grid lines.
   - Use the category filter chips:
     - Click **`POWER PLANTS (12)`** to focus on Mundra, Khavda, Kakrapar Nuclear, etc.
     - Click **`CRITICAL`** to view high-priority nodes with animated red radar pulses.
   - Click on any marker on the map to inspect capacity, voltage, customer count, and risk score.

3. **Multi-Tab Operations:**
   - **Risk Map Tab:** Full-screen GIS view with interactive floating equipment inspector.
   - **Assets Tab:** Complete searchable inventory of 836 Gujarat transformers & substations.
   - **Incidents Tab:** Outage duration, downtime hours, weather correlation, and root cause history.
   - **Crew Planning Tab:** 12 Gujarat field crews across 6 zones with skill-level assignments.

4. **The Live AI Prediction Studio ("AI Predictions" tab):**
   - Explain the XGBoost model architecture (**96.25% test accuracy**, RMSE 0.0797).
   - Demonstrate the **Instant Demo Scenarios**:
     - Click **"2. Arcing / Breakdown"**: Instantly injects high Acetylene ($C_2H_2 = 38\text{ ppm}$). Watch the model classify it as *Arcing / Partial Discharge* and recommend immediate feeder switching.
     - Click **"3. Severe Thermal Overheating"**: Injects $98^\circ\text{C}$ oil temp & $118\%$ overload. Watch the risk window drop to $6\text{h}$.
   - **Live Custom Data Input:** Let the judge suggest arbitrary numbers for temperature, vibration, or gas levels. Drag the sliders and click **"Run Live XGBoost AI Inference"** to show instant on-the-fly evaluation.

---

## 📡 Key API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Statewide KPI counts (total, critical, at-risk, customers) |
| `GET` | `/api/dashboard/risk-map` | GeoJSON/coordinates for all 836 Gujarat power assets |
| `GET` | `/api/dashboard/top-risk` | Deduplicated list of highest risk equipment |
| `GET` | `/api/assets/?limit=100` | Full asset inventory with capacity & voltage specs |
| `GET` | `/api/weather/risk` | Live IMD weather data across Gujarat districts |
| `GET` | `/api/crews/` | 12 field crew teams and availability statuses |
| `GET` | `/api/predictions/live/{asset_id}` | Live XGBoost inference on an asset's latest database telemetry |
| `POST` | `/api/predictions/predict` | On-demand ML inference for arbitrary custom sensor payloads |
| `GET` | `/api/predictions/model-info` | Model metadata, feature importances, and evaluation metrics |

---

## 🛠️ Re-training the Model or Re-ingesting Data (Optional)

If you ever want to re-train the XGBoost models or regenerate the grid:
```bash
cd backend
.\venv\Scripts\activate

# Train the XGBoost failure & fault classification models:
python -m app.ml.train

# Expand or re-seed Gujarat grid assets (836 assets, all 33 districts):
python -m scripts.expand_gujarat_grid
```

---

## 🔒 License
Developed for utility grid intelligence and predictive maintenance decision support.
