import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine
from app.models import models
from app.api import assets, sensors, weather, incidents, predictions, risks, dashboard, crews, maintenance

# Create all tables on startup (safely handle connection failures on serverless cold starts)
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    logging.warning(f"Database table initialization deferred: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Only initialize background scheduler when not running in Vercel Serverless environment
    if not os.getenv("VERCEL"):
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from app.ml.train import train

            def scheduled_training():
                logging.info("Starting automated ML model training...")
                try:
                    train()
                    logging.info("Automated training completed successfully.")
                except Exception as e:
                    logging.error(f"Automated training failed: {e}")

            scheduler = BackgroundScheduler()
            scheduler.add_job(scheduled_training, 'cron', day_of_week='sun', hour=0, minute=0)
            scheduler.start()
            yield
            scheduler.shutdown()
            return
        except Exception as e:
            logging.warning(f"Background scheduler omitted: {e}")

    yield


app = FastAPI(title="PowerGrid AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
