from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.models import RiskScore, Asset

router = APIRouter()


@router.get("/")
def get_all_risks(limit: int = 100, db: Session = Depends(get_db)):
    subq = (
        db.query(RiskScore.asset_id, func.max(RiskScore.calculated_at).label("latest"))
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    results = (
        db.query(Asset, RiskScore)
        .join(RiskScore, Asset.id == RiskScore.asset_id)
        .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.calculated_at == subq.c.latest))
        .order_by(RiskScore.overall_risk_score.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "district": a.district,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "failure_probability": r.failure_probability,
            "impact_score": r.impact_score,
            "weather_risk": r.weather_risk,
            "overall_risk_score": r.overall_risk_score,
            "risk_level": r.risk_level,
            "calculated_at": r.calculated_at,
        }
        for a, r in results
    ]


@router.get("/critical")
def get_critical_risks(db: Session = Depends(get_db)):
    subq = (
        db.query(RiskScore.asset_id, func.max(RiskScore.calculated_at).label("latest"))
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    results = (
        db.query(Asset, RiskScore)
        .join(RiskScore, Asset.id == RiskScore.asset_id)
        .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.calculated_at == subq.c.latest))
        .filter(RiskScore.risk_level == "CRITICAL")
        .order_by(RiskScore.overall_risk_score.desc())
        .all()
    )
    return [
        {
            "asset_id": a.asset_id,
            "risk_level": r.risk_level,
            "overall_risk_score": r.overall_risk_score,
            "failure_probability": r.failure_probability,
            "customers_served": a.customers_served,
        }
        for a, r in results
    ]
