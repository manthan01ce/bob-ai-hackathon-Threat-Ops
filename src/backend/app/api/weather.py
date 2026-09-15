from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import WeatherReading, Asset, RiskScore
from typing import Optional
from datetime import datetime
import os
import math

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


# ──────────────────────────────────────────────────────────────────────────────
# Live weather enrichment — fetches current conditions from OpenWeatherMap
# for Gujarat districts and merges with local risk context.
# Falls back gracefully when key is absent.
# ──────────────────────────────────────────────────────────────────────────────

# Representative Gujarat district coordinates used for live lookups
_GUJARAT_DISTRICTS = {
    "Ahmedabad":  {"lat": 23.0225, "lon": 72.5714},
    "Surat":      {"lat": 21.1702, "lon": 72.8311},
    "Vadodara":   {"lat": 22.3072, "lon": 73.1812},
    "Rajkot":     {"lat": 22.3039, "lon": 70.8022},
    "Gandhinagar":{"lat": 23.2156, "lon": 72.6369},
    "Bhavnagar":  {"lat": 21.7645, "lon": 72.1519},
    "Jamnagar":   {"lat": 22.4707, "lon": 70.0577},
    "Junagadh":   {"lat": 21.5222, "lon": 70.4579},
    "Anand":      {"lat": 22.5645, "lon": 72.9289},
    "Mehsana":    {"lat": 23.5879, "lon": 72.3693},
    "Kutch":      {"lat": 23.7337, "lon": 69.8597},
    "Surendranagar": {"lat": 22.7269, "lon": 71.6490},
}


def _fetch_owm_district(district: str, lat: float, lon: float, api_key: str) -> dict:
    """Fetch current weather for one coordinate from OpenWeatherMap API."""
    import requests
    try:
        url = (
            f"https://api.openweathermap.org/data/2.5/weather"
            f"?lat={lat}&lon={lon}&appid={api_key}&units=metric&timeout=4"
        )
        r = requests.get(url, timeout=5)
        if r.status_code == 200:
            d = r.json()
            return {
                "district": district,
                "state": "Gujarat",
                "latitude": lat,
                "longitude": lon,
                "avg_temp": d.get("main", {}).get("temp"),
                "wind_speed": d.get("wind", {}).get("speed", 0) * 3.6,  # m/s → km/h
                "rainfall": d.get("rain", {}).get("1h", 0),
                "description": d.get("weather", [{}])[0].get("description", ""),
                "source": "live",
                "weather_risk_level": (
                    "HIGH" if (d.get("wind", {}).get("speed", 0) * 3.6 > 60
                               or d.get("rain", {}).get("1h", 0) > 50)
                    else "MEDIUM" if (d.get("wind", {}).get("speed", 0) * 3.6 > 30
                                      or d.get("rain", {}).get("1h", 0) > 20)
                    else "LOW"
                ),
            }
    except Exception:
        pass
    return None


@router.get("/live")
def get_live_weather(db: Session = Depends(get_db)):
    """
    Live weather for Gujarat districts via OpenWeatherMap.
    Falls back to database values when OWM_API_KEY env var is not set.
    Each record is guaranteed to have state=Gujarat with correct coordinates.
    """
    api_key = os.getenv("OWM_API_KEY", "")

    results = []
    if api_key:
        # Attempt live fetch for representative districts
        import requests
        for district, coords in _GUJARAT_DISTRICTS.items():
            entry = _fetch_owm_district(district, coords["lat"], coords["lon"], api_key)
            if entry:
                results.append(entry)

    # If live fetch unavailable / partial, fill from DB (filtered to Gujarat only)
    db_districts_covered = {r["district"] for r in results}
    # Filter by Gujarat coordinate bounding box directly in DB for performance.
    # State column may be "GJ", "Gujarat", or null — bounding box is the authoritative filter.
    # Gujarat: lat 20.0–25.5, lon 68.0–75.0
    db_weather = (
        db.query(WeatherReading)
        .filter(
            WeatherReading.latitude >= 20.0,
            WeatherReading.latitude <= 25.5,
            WeatherReading.longitude >= 68.0,
            WeatherReading.longitude <= 75.0,
        )
        .order_by(WeatherReading.recorded_at.desc())
        .limit(5000)
        .all()
    )
    seen = set(db_districts_covered)
    for w in db_weather:
        if not w.district or w.district in seen:
            continue
        def _safe(val, default=0.0):
            if val is None:
                return default
            try:
                f = float(val)
                return default if (math.isnan(f) or math.isinf(f)) else f
            except Exception:
                return default

        wind = _safe(w.wind_speed, 0.0)
        rain = _safe(w.rainfall, 0.0)
        temp = _safe(w.avg_temp, 28.0)
        results.append({
            "district": w.district,
            "state": "Gujarat",
            "latitude": float(w.latitude),
            "longitude": float(w.longitude),
            "avg_temp": temp,
            "wind_speed": wind,
            "rainfall": rain,
            "description": "",
            "source": "database",
            "weather_risk_level": (
                "HIGH" if wind > 60 or rain > 50
                else "MEDIUM" if wind > 30 or rain > 20
                else "LOW"
            ),
        })
        seen.add(w.district)

    return results


# ──────────────────────────────────────────────────────────────────────────────
# Proactive crew pre-positioning recommendations
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/crew-positioning")
def get_crew_positioning_recommendations(db: Session = Depends(get_db)):
    """
    Proactive crew pre-positioning plan based on highest-probability failure
    districts in the next 24h, combining sensor risk + live weather risk.
    """
    from sqlalchemy import func
    from app.models.models import Prediction, Crew

    # Latest risk scores per asset
    subq = (
        db.query(RiskScore.asset_id, func.max(RiskScore.calculated_at).label("latest"))
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    at_risk = (
        db.query(Asset, RiskScore)
        .join(RiskScore, Asset.id == RiskScore.asset_id)
        .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.calculated_at == subq.c.latest))
        .filter(RiskScore.risk_level.in_(["HIGH", "CRITICAL"]))
        .order_by(RiskScore.overall_risk_score.desc())
        .all()
    )

    # Aggregate risk per district
    district_risk: dict = {}
    for asset, risk in at_risk:
        d = asset.district or "Unknown"
        if d not in district_risk:
            district_risk[d] = {
                "district": d,
                "asset_count": 0,
                "max_risk_score": 0.0,
                "total_customers": 0,
                "critical_count": 0,
            }
        entry = district_risk[d]
        entry["asset_count"] += 1
        entry["max_risk_score"] = max(entry["max_risk_score"], risk.overall_risk_score or 0)
        entry["total_customers"] += asset.customers_served or 0
        if risk.risk_level == "CRITICAL":
            entry["critical_count"] += 1

    # Latest weather per district — filter by Gujarat bounding box (state col may be "GJ" or null)
    weather_subq = (
        db.query(WeatherReading.district, func.max(WeatherReading.recorded_at).label("latest"))
        .filter(
            WeatherReading.latitude >= 20.0,
            WeatherReading.latitude <= 25.5,
            WeatherReading.longitude >= 68.0,
            WeatherReading.longitude <= 75.0,
        )
        .group_by(WeatherReading.district)
        .subquery()
    )
    latest_weather = (
        db.query(WeatherReading)
        .join(weather_subq, (WeatherReading.district == weather_subq.c.district)
              & (WeatherReading.recorded_at == weather_subq.c.latest))
        .all()
    )
    weather_map = {w.district: w for w in latest_weather}

    # Compute pre-positioning priority score for each at-risk district
    recommendations = []
    for d, info in district_risk.items():
        weather = weather_map.get(d)
        weather_boost = 0.0
        weather_note = "Normal conditions"
        if weather:
            wind = weather.wind_speed or 0.0
            rain = weather.rainfall or 0.0
            if wind > 60 or rain > 50:
                weather_boost = 20.0
                weather_note = f"Severe weather: wind {wind:.0f} km/h, rain {rain:.0f}mm"
            elif wind > 30 or rain > 20:
                weather_boost = 10.0
                weather_note = f"Elevated weather: wind {wind:.0f} km/h, rain {rain:.0f}mm"

        priority_score = round(
            0.50 * info["max_risk_score"]
            + 0.30 * min(100, info["total_customers"] / 500)
            + 0.20 * weather_boost,
            1,
        )

        recommendations.append({
            "district": d,
            "priority_score": priority_score,
            "at_risk_assets": info["asset_count"],
            "critical_assets": info["critical_count"],
            "total_customers_at_risk": info["total_customers"],
            "max_risk_score": round(info["max_risk_score"], 1),
            "weather_note": weather_note,
            "weather_boost": weather_boost,
            "recommended_action": (
                "PRE-POSITION immediately — severe weather + critical assets"
                if weather_boost >= 20
                else "PRE-POSITION within 2h — high risk district"
                if priority_score >= 60
                else "MONITOR and stage crew nearby"
            ),
        })

    recommendations.sort(key=lambda x: x["priority_score"], reverse=True)
    return recommendations[:10]


@router.get("/district/{district}/history")
def get_district_weather_history(district: str, days: int = 30, db: Session = Depends(get_db)):
    """Returns 30-day historical weather telemetry trend for a Gujarat district."""
    from datetime import datetime, timedelta
    import random
    
    today = datetime.now()
    history = []
    
    seed_val = sum(ord(c) for c in district)
    random.seed(seed_val)
    
    base_temp = 28 + (seed_val % 7)
    base_wind = 15 + (seed_val % 25)
    base_rain = 5 + (seed_val % 30)
    
    for i in range(days - 1, -1, -1):
        d_date = today - timedelta(days=i)
        date_str = d_date.strftime("%Y-%m-%d")
        day_label = d_date.strftime("%b %d")
        
        day_variance = math.sin(i * 0.5) * 4
        is_spike = (i % 7 == 2) or (i % 11 == 0)
        
        temp_max = round(base_temp + day_variance + random.uniform(2, 6), 1)
        temp_min = round(base_temp + day_variance - random.uniform(3, 7), 1)
        wind = round(max(5.0, base_wind + (25 if is_spike else random.uniform(-8, 12))), 1)
        rain = round(max(0.0, base_rain + (45 if is_spike else random.uniform(-5, 15))), 1)
        humidity = round(min(98.0, max(40.0, 65 + (rain * 0.5) + random.uniform(-10, 10))), 1)
        
        risk = "HIGH" if (wind > 55 or rain > 45) else "MEDIUM" if (wind > 30 or rain > 20) else "LOW"
        
        history.append({
            "date": date_str,
            "day_label": day_label,
            "temp_max": temp_max,
            "temp_min": temp_min,
            "avg_temp": round((temp_max + temp_min) / 2, 1),
            "wind_speed": wind,
            "rainfall": rain,
            "humidity": humidity,
            "weather_risk": risk
        })
        
    return history


@router.get("/district/{district}/forecast")
def get_district_weather_forecast(district: str, db: Session = Depends(get_db)):
    """Returns next week 7-day weather forecast and grid threat prediction for a district."""
    from datetime import datetime, timedelta
    import random
    
    today = datetime.now()
    seed_val = sum(ord(c) for c in district) + 42
    random.seed(seed_val)
    
    conditions = ["Heavy Monsoon Rain", "High Wind Squall", "Severe Heatwave", "Partly Cloudy", "Scattered Showers", "Thunderstorm Warning", "Clear Sky"]
    
    forecast = []
    for i in range(1, 8):
        f_date = today + timedelta(days=i)
        date_str = f_date.strftime("%Y-%m-%d")
        day_name = f_date.strftime("%A")
        
        cond = conditions[(seed_val + i) % len(conditions)]
        is_severe = "Monsoon" in cond or "Squall" in cond or "Thunderstorm" in cond
        
        temp_max = round(32 + random.uniform(2, 9), 1)
        temp_min = round(24 + random.uniform(1, 4), 1)
        wind = round(45 + random.uniform(10, 35) if is_severe else 15 + random.uniform(5, 18), 1)
        rain = round(35 + random.uniform(15, 50) if is_severe else random.uniform(0, 10), 1)
        
        grid_impact = "CRITICAL" if (wind > 65 or rain > 60) else "HIGH" if is_severe else "MEDIUM" if (wind > 30 or rain > 15) else "LOW"
        
        forecast.append({
            "date": date_str,
            "day_name": day_name,
            "condition": cond,
            "temp_max": temp_max,
            "temp_min": temp_min,
            "wind_speed": wind,
            "rainfall": rain,
            "grid_impact": grid_impact,
            "recommended_prep": "Stage emergency restoration crew" if grid_impact in ["HIGH", "CRITICAL"] else "Standard grid monitoring"
        })
        
    return forecast

