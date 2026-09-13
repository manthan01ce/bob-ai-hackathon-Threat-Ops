from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.database import get_db
from app.models.models import Asset, SensorReading, RiskScore, Prediction, Recommendation, Incident
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    """Main dashboard KPI summary."""
    total_assets = db.query(Asset).count()

    # Latest risk scores
    subq = (
        db.query(RiskScore.asset_id, func.max(RiskScore.calculated_at).label("latest"))
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    latest_risks = (
        db.query(RiskScore)
        .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.calculated_at == subq.c.latest))
        .all()
    )

    critical_count = sum(1 for r in latest_risks if r.risk_level == "CRITICAL")
    at_risk_count = sum(1 for r in latest_risks if r.risk_level in ("HIGH", "CRITICAL"))

    # Predicted failures in next 48h
    cutoff = datetime.utcnow() - timedelta(hours=1)
    predicted_failures = (
        db.query(Prediction)
        .filter(Prediction.failure_probability >= 0.75, Prediction.prediction_time >= cutoff)
        .count()
    )

    # Customers at risk from high-risk assets
    high_risk_ids = [r.asset_id for r in latest_risks if r.risk_level in ("HIGH", "CRITICAL")]
    customers_at_risk = (
        db.query(func.sum(Asset.customers_served))
        .filter(Asset.id.in_(high_risk_ids))
        .scalar() or 0
    )

    return {
        "total_assets": total_assets,
        "critical_assets": critical_count,
        "at_risk_assets": at_risk_count,
        "predicted_failures": predicted_failures,
        "customers_at_risk": customers_at_risk,
    }


@router.get("/risk-map")
def get_risk_map(db: Session = Depends(get_db)):
    """Return all assets with their latest risk level and coordinates for map rendering."""
    subq = (
        db.query(RiskScore.asset_id, func.max(RiskScore.calculated_at).label("latest"))
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    results = (
        db.query(Asset, RiskScore)
        .join(RiskScore, Asset.id == RiskScore.asset_id)
        .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.calculated_at == subq.c.latest))
        .all()
    )

    return [
        {
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "name": a.name,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "risk_level": r.risk_level,
            "overall_risk_score": r.overall_risk_score,
            "failure_probability": r.failure_probability,
            "customers_served": a.customers_served,
            "district": a.district,
        }
        for a, r in results
    ]


@router.get("/top-risk")
def get_top_risk_assets(limit: int = 10, db: Session = Depends(get_db)):
    """Top N unique assets ranked by overall risk score."""
    subq_risk = (
        db.query(RiskScore.asset_id, func.max(RiskScore.id).label("latest_risk_id"))
        .group_by(RiskScore.asset_id)
        .subquery()
    )
    subq_pred = (
        db.query(Prediction.asset_id, func.max(Prediction.id).label("latest_pred_id"))
        .group_by(Prediction.asset_id)
        .subquery()
    )
    results = (
        db.query(Asset, RiskScore, Prediction)
        .join(RiskScore, Asset.id == RiskScore.asset_id)
        .join(subq_risk, RiskScore.id == subq_risk.c.latest_risk_id)
        .outerjoin(subq_pred, Asset.id == subq_pred.c.asset_id)
        .outerjoin(Prediction, Prediction.id == subq_pred.c.latest_pred_id)
        .order_by(RiskScore.overall_risk_score.desc())
        .limit(limit * 2)
        .all()
    )

    seen = set()
    deduped = []
    for a, r, p in results:
        if a.asset_id not in seen:
            seen.add(a.asset_id)
            deduped.append((a, r, p))
            if len(deduped) >= limit:
                break

    return [
        {
            "rank": idx + 1,
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "risk_level": r.risk_level,
            "overall_risk_score": r.overall_risk_score,
            "failure_probability": r.failure_probability,
            "impact_score": r.impact_score,
            "health_score": p.health_score if p else 50.0,
            "customers_served": a.customers_served,
            "district": a.district,
        }
        for idx, (a, r, p) in enumerate(deduped)
    ]




@router.get("/recent-alerts")
def get_recent_alerts(limit: int = 10, db: Session = Depends(get_db)):
    """Recent incidents and high-risk predictions as alerts."""
    recent_incidents = (
        db.query(Incident, Asset)
        .join(Asset, Incident.asset_id == Asset.id)
        .order_by(Incident.started_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "type": "incident",
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "severity": i.severity,
            "fault_type": i.fault_type,
            "customers_affected": i.customers_affected,
            "started_at": i.started_at,
        }
        for i, a in recent_incidents
    ]


@router.get("/recommendations")
def get_top_recommendations(limit: int = 5, db: Session = Depends(get_db)):
    """Top open recommendations ordered by priority."""
    results = (
        db.query(Recommendation, Asset)
        .join(Asset, Recommendation.asset_id == Asset.id)
        .filter(Recommendation.status == "open")
        .order_by(Recommendation.priority.asc())
        .limit(limit)
        .all()
    )

    return [
        {
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "priority": r.priority,
            "action_type": r.action_type,
            "description": r.description,
            "urgency": r.urgency,
        }
        for r, a in results
    ]
