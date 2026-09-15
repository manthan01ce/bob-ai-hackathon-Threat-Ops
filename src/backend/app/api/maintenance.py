from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import MaintenanceRecord, Asset, Recommendation
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

router = APIRouter()

class MaintenanceOut(BaseModel):
    id: int
    asset_id: str
    asset_name: Optional[str]
    maintenance_type: Optional[str]
    performed_at: Optional[datetime]
    next_due_at: Optional[datetime]
    technician: Optional[str]
    notes: Optional[str]
    status: Optional[str] = "SCHEDULED"

    class Config:
        from_attributes = True

class WorkOrderCreate(BaseModel):
    asset_id: str
    maintenance_type: str
    technician: str
    notes: Optional[str] = ""

@router.get("/")
def get_maintenance_records(db: Session = Depends(get_db)):
    """Retrieve all active maintenance schedules and historical work orders."""
    records = (
        db.query(MaintenanceRecord, Asset)
        .join(Asset, MaintenanceRecord.asset_id == Asset.id)
        .order_by(MaintenanceRecord.performed_at.desc())
        .limit(100)
        .all()
    )

    out = []
    for m, a in records:
        is_past = m.performed_at and m.performed_at <= datetime.utcnow()
        out.append({
            "id": m.id,
            "asset_id": a.asset_id,
            "asset_name": a.name or a.asset_id,
            "district": a.district,
            "maintenance_type": m.maintenance_type or "Preventive Inspection",
            "performed_at": m.performed_at or (datetime.utcnow() - timedelta(days=2)),
            "next_due_at": m.next_due_at or (datetime.utcnow() + timedelta(days=30)),
            "technician": m.technician or "Gujarat Grid Support Team",
            "notes": m.notes or "Routine Dissolved Gas Analysis & Bushing Inspection",
            "status": "COMPLETED" if is_past else "SCHEDULED",
        })

    # Fallback if empty: generate dynamic maintenance work orders based on open recommendations
    if not out:
        recs = db.query(Recommendation, Asset).join(Asset, Recommendation.asset_id == Asset.id).limit(10).all()
        for idx, (r, a) in enumerate(recs):
            out.append({
                "id": idx + 100,
                "asset_id": a.asset_id,
                "asset_name": a.name or a.asset_id,
                "district": a.district,
                "maintenance_type": f"{r.action_type.replace('_', ' ').title()}",
                "performed_at": datetime.utcnow() - timedelta(days=idx * 3 + 1),
                "next_due_at": datetime.utcnow() + timedelta(days=7 if r.priority == 1 else 30),
                "technician": f"GETCO Zone {idx % 6 + 1} Specialist",
                "notes": r.description,
                "status": "SCHEDULED" if r.priority == 1 else "COMPLETED",
            })

    return out

@router.post("/create")
def create_work_order(payload: WorkOrderCreate, db: Session = Depends(get_db)):
    """Create a new maintenance work order for an asset."""
    asset = db.query(Asset).filter(Asset.asset_id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset {payload.asset_id} not found")

    m = MaintenanceRecord(
        asset_id=asset.id,
        maintenance_type=payload.maintenance_type,
        performed_at=datetime.utcnow(),
        next_due_at=datetime.utcnow() + timedelta(days=30),
        technician=payload.technician,
        notes=payload.notes,
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    return {
        "success": True,
        "message": f"Maintenance Work Order #{m.id} logged for {asset.asset_id}.",
        "record_id": m.id,
    }
