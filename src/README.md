# ⚡ ThreatOps Source Code (`src/`) Directory Layout

This directory contains the entire application codebase for **ThreatOps**, organized into modular, production-ready full-stack components.

---

## 📁 Source Code Directory Tree & Component Layout

```
src/
├── frontend/                 # Next.js 16 App Router UI with Leaflet GIS & Tailwind CSS
│   ├── src/
│   │   ├── app/              # Next.js pages (Dashboard, AI Studio, Transformers, Weather)
│   │   ├── components/       # GIS GridMap, DGA Inspector, Telemetry Studio, Metric tiles
│   │   └── lib/              # REST API client integrations & type definitions
│   ├── public/               # Static assets & icons
│   ├── .env.example          # Frontend environment variables & MapTiler API key
│   ├── package.json          # Node package dependencies
│   └── tsconfig.json         # TypeScript configuration
│
├── backend/                  # Python 3.10+ FastAPI REST Server & ML Pipeline
│   ├── app/
│   │   ├── api/              # High-performance REST endpoints (assets, DGA telemetry, weather, crews)
│   │   ├── db/               # SQLAlchemy ORM session & Neon Serverless PostgreSQL engine
│   │   ├── ml/               # Multi-class XGBoost model training pipeline & SHAP artifacts
│   │   ├── models/           # Relational ORM models (836+ assets, 12 crews, incidents)
│   │   └── services/         # Real-time DGA chemical risk & failure prediction engine
│   ├── scripts/              # Data ingestion & statewide 33-district Gujarat grid expansion
│   ├── requirements.txt      # Backend Python package requirements
│   └── .env.example          # Backend environment variables & Neon database connection
│
├── api/                      # Vercel Serverless Function entrypoint
│   └── index.py              # Root serverless router forwarding requests to FastAPI backend
│
├── .env.example              # Consolidated environment configuration template
├── setup.bat                 # One-click Windows development setup script
└── start.bat                 # One-click dual-service runner (Frontend + Backend)
```

---

## 🔑 Key Architectural Highlights

1. **Frontend (`src/frontend`)**: Built with **Next.js 16 (Turbopack)**, Tailwind CSS, Leaflet GIS mapping, and Recharts. Features full station search, interactive DGA sliders, District Weather Threat Radar, and automated field crew dispatch.
2. **Backend (`src/backend`)**: Built with **Python FastAPI & Uvicorn**, hosting our **96.25% accurate XGBoost multi-class DGA gas model** ($C_2H_2, C_2H_4, CH_4, H_2, CO$), SHAP attribution, and 30-day weather history with 7-day forecasting.
3. **Serverless Deployment (`src/api`)**: Root `api/index.py` bridges FastAPI with Vercel's serverless infrastructure for zero-maintenance cloud deployments.

For step-by-step instructions on setting up and running ThreatOps locally, please see [`docs/setup-guide.md`](../docs/setup-guide.md).
