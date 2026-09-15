from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
import logging
from contextlib import asynccontextmanager

from app.db.database import engine
from app.models import models
from app.api import assets, sensors, weather, incidents, predictions, risks, dashboard, crews, maintenance
from app.ml.train import train

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

def scheduled_training():
    logging.info("Starting automated ML model training...")
    try:
        train()
        logging.info("Automated training completed successfully.")
    except Exception as e:
        logging.error(f"Automated training failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    # Schedule training every week (for demonstration we can set it to run on startup or on an interval)
    # Let's run it once a week, for example every Sunday at midnight
    scheduler.add_job(scheduled_training, 'cron', day_of_week='sun', hour=0, minute=0)
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(title="PowerGrid AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(assets.router,      prefix="/api/assets",      tags=["Assets"])
app.include_router(sensors.router,     prefix="/api/sensors",     tags=["Sensors"])
app.include_router(weather.router,     prefix="/api/weather",     tags=["Weather"])
app.include_router(incidents.router,   prefix="/api/incidents",   tags=["Incidents"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])
app.include_router(risks.router,       prefix="/api/risks",       tags=["Risks"])
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])
app.include_router(crews.router,       prefix="/api/crews",       tags=["Crews"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Maintenance"])


@app.get("/")
def health_check():
    return {"status": "ok", "message": "PowerGrid AI API is running"}

