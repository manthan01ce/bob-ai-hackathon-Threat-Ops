from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Incident, Asset
from typing import Optional
from datetime import datetime

router = APIRouter()


@router.get("/")
def get_incidents(
    asset_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    limit: int = 50,
    db: Session = Depends(get_db),
):
    q = db.query(Incident, Asset).join(Asset, Incident.asset_id == Asset.id)
    if asset_id:
        q = q.filter(Asset.asset_id == asset_id)
    if severity:
        q = q.filter(Incident.severity == severity.upper())
    results = q.order_by(Incident.started_at.desc()).limit(limit).all()

    return [
        {
            "id": i.id,
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "fault_type": i.fault_type,
            "severity": i.severity,
            "started_at": i.started_at,
            "duration_hrs": i.duration_hrs,
            "customers_affected": i.customers_affected,
            "weather_condition": i.weather_condition,
            "root_cause": i.root_cause,
        }
        for i, a in results
    ]
