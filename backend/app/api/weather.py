from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import WeatherReading
from typing import Optional
from datetime import datetime

router = APIRouter()


@router.get("/")
def get_weather(
    district: Optional[str] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(WeatherReading)
    if district:
        q = q.filter(WeatherReading.district == district)
    return q.order_by(WeatherReading.recorded_at.desc()).limit(limit).all()


@router.get("/latest")
def get_latest_weather(district: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(WeatherReading)
    if district:
        q = q.filter(WeatherReading.district == district)
    return q.order_by(WeatherReading.recorded_at.desc()).first()


@router.get("/risk")
def get_weather_risk(db: Session = Depends(get_db)):
    """Return latest weather across Gujarat districts with risk flags."""
    from sqlalchemy import func
    subq = (
        db.query(
            WeatherReading.district,
            func.max(WeatherReading.recorded_at).label("latest")
        )
        .group_by(WeatherReading.district)
        .subquery()
    )
    latest = (
        db.query(WeatherReading)
        .join(subq, (WeatherReading.district == subq.c.district) & (WeatherReading.recorded_at == subq.c.latest))
        .all()
    )

    import math

    def clean_float(val, default=None):
        if val is None:
            return default
        try:
            f = float(val)
            return None if (math.isnan(f) or math.isinf(f)) else f
        except Exception:
            return default

    results = []
    for w in latest:
        wind = clean_float(w.wind_speed, 0.0)
        rain = clean_float(w.rainfall, 0.0)
        temp = clean_float(w.avg_temp, 28.0)

        risk_level = "LOW"
        if wind and wind > 60:
            risk_level = "HIGH"
        elif rain and rain > 50:
            risk_level = "HIGH"
        elif (wind and wind > 30) or (rain and rain > 20):
            risk_level = "MEDIUM"

        results.append({
            "district": w.district,
            "latitude": clean_float(w.latitude),
            "longitude": clean_float(w.longitude),
            "avg_temp": temp,
            "wind_speed": wind,
            "rainfall": rain,
            "recorded_at": w.recorded_at,
            "weather_risk_level": risk_level,
        })

    return results

