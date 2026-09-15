# Solution Overview — PowerGrid Ai AI Grid Advisor

## 💡 Overview

**ThreatOps** is an AI-powered decision-support and predictive maintenance platform designed specifically for electrical grid operators. It bridges the gap between raw SCADA sensor streams, multi-class DGA chemistry analysis, real-time GIS mapping, and automated maintenance workflow dispatch.

---

## 🔑 Core Mechanism & Key Features

### 1. Multi-Class XGBoost Machine Learning Failure Engine
- **High Accuracy (96.25% Test Accuracy):** Trained on authentic Dissolved Gas Analysis (DGA) chemistry ($C_2H_2, C_2H_4, CH_4, H_2, CO, CO_2$), IEC 60599 Rogers Ratios, dielectric oil breakdown voltage, winding temperatures, and operational load.
- **Fault Diagnosis:** Accurately classifies multi-class fault modes:
  - *Normal Safe Operation*
  - *Arcing / Partial Discharge*
  - *Thermal Overheating*
  - *Insulation Degradation*
  - *Dielectric Breakdown*
  - *Mechanical Strain / Vibration*
- **Predictive Horizon Windows:** Outputs risk horizon windows (`6h`, `24h`, `48h`, `7d`) alongside 0–100 Health Index scoring.

### 2. Interactive Gujarat Statewide GIS Grid Map
- **836+ Grid Assets mapped across all 33 Gujarat districts:** Real power generation stations (Mundra Thermal 4,620 MW, Khavda Solar/Wind 30,000 MW, Kakrapar Nuclear, Charanka Solar, Ukai Hydro) plus GETCO high-voltage substations and transformers.
- **MapTiler Layer Switching:** Toggle between Dark SCADA, Satellite Aerial, and Highway Grid views.
- **Animated Transmission Corridors:** Live visual lines connecting 400kV and 220kV transmission networks.

### 3. Interactive AI Testing Studio
- **Live Sensor Controls:** Sliders for temperature, vibration, load ratio, and gas chemistry values for real-time model inference.
- **Instant Operational Presets:** One-click presets for testing Arcing, Severe Thermal Overheating, Normal Operation, and Vibration strain.
- **SHAP Feature Importance & Recommendations:** Clear visual breakdown of why the AI made a specific decision and recommended crew action.

### 4. Automated Field Crew Dispatch
- **12 Gujarat Field Crews across 6 Operational Zones:** Automated assignment based on geographic location, zone capacity, and required engineer skill sets.

---

## 🎨 User Experience Flow

1. **Monitor State at a Glance:** The operator views the statewide dashboard header with live telemetry status and top risk indicators.
2. **Geographical Drill-Down:** The operator spots pulsing red radar markers on high-risk substations on the Leaflet grid map and clicks to inspect capacity, DGA status, and customer outage risk.
3. **AI Inference & Diagnosis:** The operator toggles the AI Predictions Studio to inspect SHAP feature attribution or run custom parameter scenarios.
4. **Dispatch Field Crew:** The operator initiates one-click field crew dispatch, sending prioritized alerts to local substation engineers.
