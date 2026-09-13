from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.models import Asset, RiskScore, Prediction, Recommendation
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class AssetOut(BaseModel):
    id: int
    asset_id: str
    asset_type: str
    name: Optional[str]
    latitude: float
    longitude: float
    capacity_mva: Optional[float]
    voltage_kv: Optional[float]
    manufacturer: Optional[str]
    status: str
    customers_served: Optional[int]
    critical_facilities: Optional[int]
    district: Optional[str]
    state: Optional[str]
    installation_date: Optional[datetime]

    class Config:
        from_attributes = True


@router.get("/", response_model=List[AssetOut])
def get_assets(
    skip: int = 0,
    limit: int = 100,
    asset_type: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Asset)
    if asset_type:
        q = q.filter(Asset.asset_type == asset_type)
    if district:
        q = q.filter(Asset.district == district)
    return q.offset(skip).limit(limit).all()


@router.get("/critical", response_model=List[AssetOut])
def get_critical_assets(db: Session = Depends(get_db)):
    """Return assets whose latest risk score is CRITICAL or HIGH."""
    subq = (
        db.query(RiskScore.asset_id, func.max(RiskScore.calculated_at).label("latest"))
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    critical_ids = (
        db.query(RiskScore.asset_id)
        .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.calculated_at == subq.c.latest))
        .filter(RiskScore.risk_level.in_(["CRITICAL", "HIGH"]))
        .all()
    )
    ids = [r[0] for r in critical_ids]
    return db.query(Asset).filter(Asset.id.in_(ids)).all()


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.get("/{asset_id}/risk")
def get_asset_risk(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    risk = (
        db.query(RiskScore)
        .filter(RiskScore.asset_id == asset.id)
        .order_by(RiskScore.calculated_at.desc())
        .first()
    )
    return risk


@router.get("/{asset_id}/prediction")
def get_asset_prediction(asset_id: str, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    prediction = (
        db.query(Prediction)
        .filter(Prediction.asset_id == asset.id)
        .order_by(Prediction.prediction_time.desc())
        .first()
    )
    return prediction
