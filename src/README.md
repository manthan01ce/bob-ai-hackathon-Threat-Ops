# Source Code (`src/`) Layout

This directory contains all source code and operational assets for **ThreatOps**.

```
src/
├── backend/                  # FastAPI REST Server & Machine Learning Pipeline
│   ├── app/
│   │   ├── api/              # API endpoints (dashboard, assets, incidents, predictions, crews)
│   │   ├── db/               # SQLAlchemy ORM session & Neon Postgres engine
│   │   ├── ml/               # XGBoost training pipeline & model artifacts
│   │   ├── models/           # Relational ORM models
│   │   └── services/         # Real-time ML inference service
│   ├── scripts/              # Data ingestion & statewide Gujarat grid expansion
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment variables
│
├── frontend/                 # Next.js 16 Web Dashboard UI
│   ├── src/
│   │   ├── app/              # App Router (page.tsx - Multi-tab UI)
│   │   ├── components/       # Leaflet + MapTiler GIS Map & Studio controls
│   │   └── lib/              # API client methods
│   ├── package.json          # Node dependencies
│   └── tsconfig.json         # TypeScript configuration
│
├── fetch_osm.py              # OpenStreetMap utility script
├── requirements.txt          # Root Python dependencies
├── setup.bat                 # One-click Windows setup script
├── start.bat                 # One-click dual-service runner
└── weather_2019_2020.csv     # Historical weather telemetry dataset
```

For detailed instructions on setting up and running the application locally, refer to [`docs/setup-guide.md`](../docs/setup-guide.md).
