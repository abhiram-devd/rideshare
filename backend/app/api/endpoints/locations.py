from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import Location
from app.schemas import schemas

router = APIRouter()

@router.get("/", response_model=List[schemas.LocationResponse], status_code=status.HTTP_200_OK)
def get_locations(db: Session = Depends(get_db)):
    """
    Get all active pre-defined locations.
    """
    locations = db.query(Location).filter(Location.is_active == True).order_by(Location.name).all()
    return locations
