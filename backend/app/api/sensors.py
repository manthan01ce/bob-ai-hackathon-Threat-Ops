from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import SensorReading, Asset
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/{asset_id}/history")
def get_sensor_history(
    asset_id: str,
    hours: int = Query(24, ge=1, le=168),
    db: Session = Depends(get_db),
):
    """Time-series sensor history for a given asset (last N hours)."""
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        return []
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    readings = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset.id, SensorReading.timestamp >= cutoff)
        .order_by(SensorReading.timestamp.asc())
        .all()
    )
    if not readings:
        readings = (
            db.query(SensorReading)
            .filter(SensorReading.asset_id == asset.id)
            .order_by(SensorReading.timestamp.desc())
            .limit(24)
            .all()
        )
        readings.reverse()
    import math

    def clean_f(val, default=None):
        if val is None:
            return default
        try:
            f = float(val)
            return None if (math.isnan(f) or math.isinf(f)) else f
        except Exception:
            return default

    return [
        {
            "timestamp": r.timestamp,
            "temperature": clean_f(r.temperature, 55.0),
            "oil_temperature": clean_f(r.oil_temperature, 50.0),
            "vibration": clean_f(r.vibration, 2.0),
            "load_percent": clean_f(r.load_percent, 60.0),
            "voltage": clean_f(r.voltage),
            "current": clean_f(r.current),
            "power_factor": clean_f(r.power_factor),
            "partial_discharge": clean_f(r.partial_discharge),
        }
        for r in readings
    ]


@router.get("/{asset_id}/latest")
def get_latest_sensor(asset_id: str, db: Session = Depends(get_db)):
    """Most recent sensor reading for an asset."""
    import math

    def clean_f(val, default=None):
        if val is None:
            return default
        try:
            f = float(val)
            return None if (math.isnan(f) or math.isinf(f)) else f
        except Exception:
            return default

    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        return {}
    r = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset.id)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )
    if not r:
        return {}
    return {
        "timestamp": r.timestamp,
        "temperature": clean_f(r.temperature, 55.0),
        "oil_temperature": clean_f(r.oil_temperature, 50.0),
        "vibration": clean_f(r.vibration, 2.0),
        "load_percent": clean_f(r.load_percent, 60.0),
        "voltage": clean_f(r.voltage),
        "current": clean_f(r.current),
        "power_factor": clean_f(r.power_factor),
        "partial_discharge": clean_f(r.partial_discharge),
    }
