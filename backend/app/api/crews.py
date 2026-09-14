from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Crew

router = APIRouter()


@router.get("/")
def get_crews(db: Session = Depends(get_db)):
    """List all field crews and their operational status."""
    crews = db.query(Crew).order_by(Crew.zone.asc(), Crew.crew_id.asc()).all()
    return [
        {
            "id": c.id,
            "crew_id": c.crew_id,
            "name": c.name,
            "zone": c.zone,
            "latitude": c.latitude,
            "longitude": c.longitude,
            "available": c.available,
            "skill_level": c.skill_level,
        }
        for c in crews
    ]


@router.post("/{crew_id}/dispatch")
def dispatch_crew(crew_id: str, asset_id: str = None, db: Session = Depends(get_db)):
    """Dispatch a field crew to a specified asset or nearest critical incident."""
    from app.models.models import Asset, RiskScore
    from sqlalchemy import func
    import math

    crew = db.query(Crew).filter((Crew.crew_id == crew_id) | (Crew.id == int(crew_id) if crew_id.isdigit() else False)).first()
    if not crew:
        return {"success": False, "message": f"Crew {crew_id} not found"}

    target_asset = None
    if asset_id:
        target_asset = db.query(Asset).filter(Asset.asset_id == asset_id).first()

    if not target_asset:
        # Find highest risk asset in closest proximity
        subq = (
            db.query(RiskScore.asset_id, func.max(RiskScore.calculated_at).label("latest"))
            .group_by(RiskScore.asset_id)
            .subquery()
        )
        critical_risks = (
            db.query(Asset, RiskScore)
            .join(RiskScore, Asset.id == RiskScore.asset_id)
            .join(subq, (RiskScore.asset_id == subq.c.asset_id) & (RiskScore.calculated_at == subq.c.latest))
            .filter(RiskScore.risk_level.in_(["CRITICAL", "HIGH"]))
            .all()
        )

        min_dist = float("inf")
        for a, r in critical_risks:
            dist = math.hypot(a.latitude - crew.latitude, a.longitude - crew.longitude)
            if dist < min_dist:
                min_dist = dist
                target_asset = a

    if not target_asset:
        target_asset = db.query(Asset).first()

    crew.available = False
    db.commit()

    dist_km = round(math.hypot(target_asset.latitude - crew.latitude, target_asset.longitude - crew.longitude) * 111, 1)
    eta_mins = max(10, int(dist_km * 2.2))

    return {
        "success": True,
        "crew_id": crew.crew_id,
        "crew_name": crew.name,
        "assigned_asset_id": target_asset.asset_id,
        "asset_name": target_asset.name or target_asset.asset_id,
        "district": target_asset.district,
        "distance_km": dist_km,
        "eta_minutes": eta_mins,
        "message": f"Crew {crew.name} ({crew.crew_id}) successfully dispatched to {target_asset.asset_id} ({target_asset.district}). ETA: {eta_mins} mins."
    }


@router.post("/{crew_id}/reset")
def reset_crew(crew_id: str, db: Session = Depends(get_db)):
    """Reset a crew's status back to available."""
    crew = db.query(Crew).filter((Crew.crew_id == crew_id) | (Crew.id == int(crew_id) if crew_id.isdigit() else False)).first()
    if not crew:
        return {"success": False, "message": f"Crew {crew_id} not found"}
    crew.available = True
    db.commit()
    return {"success": True, "message": f"Crew {crew.name} is now available for dispatch."}

