from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.models import User, Report
from app.schemas import schemas

router = APIRouter()

@router.post("/", response_model=schemas.ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    report_in: schemas.ReportCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    File a report against a user.
    - Validator confirms reporter is not reporting themselves.
    - Verifies the reported user exists.
    """
    if report_in.reported_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report yourself."
        )
        
    reported_user = db.query(User).filter(User.id == report_in.reported_user_id).first()
    if not reported_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reported user not found."
        )
        
    report = Report(
        reporter_id=current_user.id,
        reported_user_id=report_in.reported_user_id,
        trip_id=report_in.trip_id,
        reason=report_in.reason,
        description=report_in.description,
        status="PENDING"
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return report
