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


@router.get("/stream")
def get_sensor_stream(limit: int = 50, db: Session = Depends(get_db)):
    """Latest live sensor telemetry stream across monitored grid assets."""
    from app.models.models import RiskScore, Prediction
    from sqlalchemy import func
    import math

    def clean_f(val, default=None):
        if val is None:
            return default
        try:
            f = float(val)
            return None if (math.isnan(f) or math.isinf(f)) else f
        except Exception:
            return default

    subq = (
        db.query(SensorReading.asset_id, func.max(SensorReading.id).label("latest_id"))
        .group_by(SensorReading.asset_id)
        .subquery()
    )
    results = (
        db.query(Asset, SensorReading)
        .join(SensorReading, Asset.id == SensorReading.asset_id)
        .join(subq, SensorReading.id == subq.c.latest_id)
        .order_by(SensorReading.timestamp.desc())
        .limit(limit)
        .all()
    )

    out = []
    for a, r in results:
        raw_temp = clean_f(r.temperature, 55.0)
        temp = 55.0 if raw_temp is None else float(raw_temp)

        raw_oil = clean_f(r.oil_temperature, 50.0)
        oil_temp = (temp - 5.0) if raw_oil is None else float(raw_oil)

        raw_vib = clean_f(r.vibration, 2.0)
        vib = 2.0 if raw_vib is None else float(raw_vib)

        raw_load = clean_f(r.load_percent, 65.0)
        load = 65.0 if raw_load is None else float(raw_load)

        # Status check
        status = "NORMAL"
        if temp > 85 or oil_temp > 80 or vib > 5.0 or load > 105:
            status = "CRITICAL"
        elif temp > 75 or vib > 3.5 or load > 90:
            status = "WARNING"

        out.append({
            "asset_id": a.asset_id,
            "asset_name": a.name or a.asset_id,
            "asset_type": a.asset_type,
            "district": a.district,
            "timestamp": r.timestamp,
            "temperature": temp,
            "oil_temperature": oil_temp,
            "vibration": vib,
            "load_percent": load,
            "voltage": clean_f(r.voltage, 33.0),
            "current": clean_f(r.current, 350.0),
            "power_factor": clean_f(r.power_factor, 0.95),
            "status": status,
        })
    return out

