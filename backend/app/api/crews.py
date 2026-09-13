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
