# ⚡ ThreatOps — Predictive Grid Outage & Equipment Failure Advisor

> **Predict. Prevent. Keep the Grid On.**  
> An AI-powered decision-support platform for modern electrical grids that predicts high-voltage equipment failures, estimates outage impacts, maps transmission corridors across Gujarat, and automates field crew dispatch before outages occur.

---

## 👥 Team

- **Team Name:** ThreatOps Team
- **Track:** AI
- **Lead:** Manthan (manthan@example.com)
- **Members:** Manthan (manthan@example.com)

---

## ❓ Problem Statement

High-voltage power transformers and substations are critical grid assets subject to severe thermal, electrical, and chemical stress. Grid operators currently face two major challenges:
1. **Reactive Emergency Response:** Equipment failures and DGA gas anomalies are often discovered only after an outage occurs, leading to prolonged blackout risks and costly emergency repairs.
2. **Manual Sensor Log Correlation:** Correlating Dissolved Gas Analysis (DGA) chemistry reports ($C_2H_2, C_2H_4, CH_4, H_2, CO, CO_2$), oil temperatures, and load telemetry manually takes 3+ hours per incident.

---

## 💡 Solution

ThreatOps is an end-to-end AI decision-support platform that ingests multi-sensor grid telemetry, evaluates DGA chemistry using a multi-class XGBoost machine learning model (achieving **96.25% test accuracy**), visualizes 836+ Gujarat grid assets on an interactive GIS map, and automates skill-optimized field crew dispatch prior to failure.

---

## 🌟 Key Features

1. **🤖 Machine Learning Failure Engine (XGBoost):**
   - 96.25% multi-class classification accuracy across 6 fault states (*Normal Safe*, *Arcing / Partial Discharge*, *Thermal Overheating*, *Insulation Degradation*, *Dielectric Breakdown*, *Mechanical Strain*).
   - Provides failure probability scoring (0–100) and risk horizon predictions (`6h`, `24h`, `48h`, `7d`).

2. **🗺️ Interactive Statewide Gujarat GIS Map:**
   - Visualizes 836+ assets across all 33 Gujarat districts (including Mundra Thermal, Khavda Solar/Wind, Kakrapar Nuclear, Charanka Solar, Ukai Hydro).
   - MapTiler layer switcher (Dark SCADA, Satellite Aerial, Highway Grid views) with animated 400kV/220kV transmission line corridors.

3. **🧪 Interactive AI Testing Studio:**
   - Live telemetry sliders and 4 one-click operational presets for immediate model testing.
   - SHAP feature importance attribution explaining why predictions were triggered.

4. **👥 Automated Field Crew Dispatch:**
   - 12 Gujarat field crews across 6 operational zones assigned automatically based on geographic proximity and engineer specialization.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS, Leaflet GIS, MapTiler, Lucide Icons
- **Backend:** Python 3.10+, FastAPI, Uvicorn, SQLAlchemy ORM, Pydantic
- **Machine Learning:** XGBoost, scikit-learn, joblib, SHAP, pandas, numpy
- **Database:** Neon Serverless PostgreSQL

---

## 🚀 How to Run

For complete setup instructions, prerequisites, and environment variable setup, refer to [`docs/setup-guide.md`](docs/setup-guide.md).

### **Quick Command Summary**

```cmd
cd src
setup.bat
start.bat
```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend:** [http://localhost:8000](http://localhost:8000)
- **Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🎬 Demo

- **Demo Video:** [`demo/demo-video-link.txt`](demo/demo-video-link.txt)
- **Live Deployment:** [`demo/live-demo-url.txt`](demo/live-demo-url.txt) (Status: `NOT DEPLOYED`)
- **Screenshots:** [`demo/screenshots/`](demo/screenshots/)

---

## ⚠️ Known Limitations

1. **DGA Sensor Calibration:** The system currently relies on simulated telemetry and standard DGA laboratory datasets; direct SCADA protocol hooks (e.g. DNP3/IEC 61850) require hardware gateway integration.
2. **Weather Integration:** Live weather risk scores use synthetic IMD district estimations for demo stability when live external weather APIs are unreachable.

---

## 🏆 What We're Most Proud Of

- **High-Accuracy ML Model:** Reaching **96.25% test accuracy** on complex multi-class DGA fault classification.
- **Rich Statewide Grid Visuals:** Mapping 836 real grid assets across all 33 Gujarat districts with interactive satellite and SCADA views.
- **Interactive AI Studio:** Giving judges and operators immediate real-time control to test edge-case sensor inputs on the fly.
