import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine
from app.models import models
from app.api import assets, sensors, weather, incidents, predictions, risks, dashboard, crews, maintenance

# Create all tables on startup & auto-seed if empty
try:
    models.Base.metadata.create_all(bind=engine)
    from app.db.database import SessionLocal
    db_session = SessionLocal()
    if db_session.query(models.Asset).count() == 0:
        try:
            from scripts.expand_gujarat_grid import expand_grid
            expand_grid()
        except Exception as seed_err:
            logging.warning(f"Grid auto-seeding deferred: {seed_err}")
    db_session.close()
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

# Routers — Registered with both /prefix and /api/prefix for Vercel serverless routing compatibility
app.include_router(assets.router,      prefix="/assets",          tags=["Assets"])
app.include_router(assets.router,      prefix="/api/assets",      tags=["Assets"])

app.include_router(sensors.router,     prefix="/sensors",         tags=["Sensors"])
app.include_router(sensors.router,     prefix="/api/sensors",     tags=["Sensors"])

app.include_router(weather.router,     prefix="/weather",         tags=["Weather"])
app.include_router(weather.router,     prefix="/api/weather",     tags=["Weather"])

app.include_router(incidents.router,   prefix="/incidents",       tags=["Incidents"])
app.include_router(incidents.router,   prefix="/api/incidents",   tags=["Incidents"])

app.include_router(predictions.router, prefix="/predictions",     tags=["Predictions"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["Predictions"])

app.include_router(risks.router,       prefix="/risks",           tags=["Risks"])
app.include_router(risks.router,       prefix="/api/risks",       tags=["Risks"])

app.include_router(dashboard.router,   prefix="/dashboard",       tags=["Dashboard"])
app.include_router(dashboard.router,   prefix="/api/dashboard",   tags=["Dashboard"])

app.include_router(crews.router,       prefix="/crews",           tags=["Crews"])
app.include_router(crews.router,       prefix="/api/crews",       tags=["Crews"])

app.include_router(maintenance.router, prefix="/maintenance",     tags=["Maintenance"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Maintenance"])


@app.get("/")
def health_check():
    return {"status": "ok", "message": "PowerGrid AI API is running"}
