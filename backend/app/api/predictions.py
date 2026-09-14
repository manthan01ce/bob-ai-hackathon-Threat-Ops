from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Prediction, Asset, SensorReading
from app.services.ml_service import predict_failure, get_model_info
from typing import Dict, Any, Optional
from pydantic import BaseModel

router = APIRouter()


class PredictRequest(BaseModel):
    hydrogen: Optional[float] = None
    methane: Optional[float] = None
    co: Optional[float] = None
    co2: Optional[float] = None
    ethylene: Optional[float] = None
    ethane: Optional[float] = None
    acetylene: Optional[float] = None
    power_factor: Optional[float] = None
    dielectric_rigidity: Optional[float] = None
    water_content: Optional[float] = None
    temperature: Optional[float] = None
    oil_temperature: Optional[float] = None
    vibration: Optional[float] = None
    load_percent: Optional[float] = None
    voltage: Optional[float] = None
    current: Optional[float] = None
    # Weather features — combined per U1 problem statement
    wind_speed: Optional[float] = None
    rainfall: Optional[float] = None


@router.get("/model-info")
def model_info():
    """Returns trained XGBoost model status, accuracy metrics, and feature importances."""
    return get_model_info()


@router.post("/predict")
def run_prediction(payload: PredictRequest):
    """Run real-time XGBoost ML inference on custom telemetry input."""
    try:
        result = predict_failure(payload.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/{asset_id}")
def get_live_prediction(asset_id: str, db: Session = Depends(get_db)):
    """
    Fetches the latest telemetry for an asset from the database and runs
    real-time XGBoost inference to predict failure probability and fault mode.
    """
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    sensor = (
        db.query(SensorReading)
        .filter(SensorReading.asset_id == asset.id)
        .order_by(SensorReading.timestamp.desc())
        .first()
    )

    pred_db = (
        db.query(Prediction)
        .filter(Prediction.asset_id == asset.id)
        .order_by(Prediction.prediction_time.desc())
        .first()
    )

    telemetry = {
        "temperature": sensor.temperature if sensor else 58.0,
        "oil_temperature": sensor.oil_temperature if sensor else 52.0,
        "vibration": sensor.vibration if sensor else 2.1,
        "load_percent": sensor.load_percent if sensor else 65.0,
        "voltage": sensor.voltage if sensor else 33.0,
        "current": sensor.current if sensor else 320.0,
        "power_factor": sensor.power_factor if sensor else 0.85,
        "hydrogen": pred_db.dga_hydrogen if pred_db else 25.0,
        "methane": pred_db.dga_methane if pred_db else 30.0,
        "co": pred_db.dga_co if pred_db else 250.0,
        "ethylene": pred_db.dga_ethylene if pred_db else 18.0,
    }

    try:
        prediction = predict_failure(telemetry)
        prediction["asset_id"] = asset.asset_id
        prediction["asset_type"] = asset.asset_type
        prediction["asset_name"] = asset.name
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/")
def get_predictions(limit: int = 50, db: Session = Depends(get_db)):
    results = (
        db.query(Prediction, Asset)
        .join(Asset, Prediction.asset_id == Asset.id)
        .order_by(Prediction.failure_probability.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "failure_probability": p.failure_probability,
            "health_score": p.health_score,
            "risk_window": p.risk_window,
            "life_expectation": p.life_expectation,
            "prediction_time": p.prediction_time,
        }
        for p, a in results
    ]


@router.get("/{asset_id}")
def get_prediction_for_asset(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        return {}
    prediction = (
        db.query(Prediction)
        .filter(Prediction.asset_id == asset.id)
        .order_by(Prediction.prediction_time.desc())
        .first()
    )
    return prediction or {}
