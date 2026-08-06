from datetime import datetime, timezone
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.core.database import get_db
from app.models.models import JoinRequest, Trip, TripMember, User
from app.schemas import schemas

router = APIRouter()

@router.post("/trips/{trip_id}/requests", response_model=schemas.JoinRequestResponse, status_code=status.HTTP_201_CREATED)
def request_to_join_trip(
    trip_id: UUID,
    req_in: schemas.JoinRequestCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Submit a join request for an OPEN trip.
    Validations:
    - Trip exists and status is OPEN.
    - Requester is not the creator.
    - Requester is not already a member.
    - No existing pending/accepted join request by this user.
    """
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
        
    if trip.creator_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot request to join your own trip."
        )
        
    if trip.status != "OPEN":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This trip is not open for new join requests."
        )
        
    # Check if already a member
    is_member = db.query(TripMember).filter(
        TripMember.trip_id == trip_id,
        TripMember.user_id == current_user.id
    ).first()
    if is_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already a member of this trip."
        )
        
    # Check duplicate pending request
    existing_pending = db.query(JoinRequest).filter(
        JoinRequest.trip_id == trip_id,
        JoinRequest.requester_id == current_user.id,
        JoinRequest.status == "PENDING"
    ).first()
    
    if existing_pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending join request for this trip."
        )
        
    new_request = JoinRequest(
        trip_id=trip_id,
        requester_id=current_user.id,
        status="PENDING",
        message=req_in.message if req_in else None
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)
    
    # Reload with requester relationship
    return db.query(JoinRequest).options(
        joinedload(JoinRequest.requester)
    ).filter(JoinRequest.id == new_request.id).first()


@router.get("/requests/incoming", response_model=List[schemas.JoinRequestResponse])
def get_incoming_requests(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get incoming join requests for all active/upcoming trips created by the current user.
    """
    # Find all trips created by me that are not COMPLETED/CANCELLED
    my_trip_ids = db.query(Trip.id).filter(
        Trip.creator_id == current_user.id,
        Trip.status.in_(["OPEN", "FULL"])
    ).subquery()
    
    requests = db.query(JoinRequest).options(
        joinedload(JoinRequest.requester),
        joinedload(JoinRequest.trip).joinedload(Trip.origin),
        joinedload(JoinRequest.trip).joinedload(Trip.destination)
    ).filter(
        JoinRequest.trip_id.in_(my_trip_ids)
    ).order_by(JoinRequest.created_at.desc()).all()
    
    return requests


@router.get("/requests/outgoing", response_model=List[schemas.JoinRequestResponse])
def get_outgoing_requests(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all outgoing join requests submitted by current user.
    """
    requests = db.query(JoinRequest).options(
        joinedload(JoinRequest.requester),
        joinedload(JoinRequest.trip).joinedload(Trip.origin),
        joinedload(JoinRequest.trip).joinedload(Trip.destination)
    ).filter(
        JoinRequest.requester_id == current_user.id
    ).order_by(JoinRequest.created_at.desc()).all()
    
    return requests


@router.post("/requests/{id}/accept", response_model=schemas.JoinRequestResponse)
def accept_join_request(
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accept an incoming join request.
    Uses PostgreSQL transaction with SELECT ... FOR UPDATE explicit row locking
    on the Trip row to prevent double-booking or overfilling seat capacity.
    """
    # Fetch request
    request = db.query(JoinRequest).filter(JoinRequest.id == id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
        
    # Transaction lock begins here
    try:
        # 1. Lock the trip row explicitly to block concurrent modifiers
        trip = db.query(Trip).filter(Trip.id == request.trip_id).with_for_update().first()
        if not trip:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked trip could not be found."
            )
            
        # 2. Check authorization
        if trip.creator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the trip creator can accept join requests."
            )
            
        # 3. Check request status is still PENDING
        if request.status != "PENDING":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This join request has already been processed or cancelled."
            )
            
        # 4. Check trip status
        if trip.status not in ["OPEN", "FULL"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trip is cancelled or completed."
            )
            
        # 5. Query active member count under transactional lock
        confirmed_count = db.query(func.count(TripMember.id)).filter(
            TripMember.trip_id == trip.id,
            TripMember.status == "CONFIRMED"
        ).scalar() or 0
        
        # 6. Check Capacity limits
        if confirmed_count >= trip.max_passengers:
            # Mark request as rejected/cancelled and update trip status
            trip.status = "FULL"
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This trip is already full. Cannot accept more travelers."
            )
            
        # 7. Check if requester already has membership
        existing_member = db.query(TripMember).filter(
            TripMember.trip_id == trip.id,
            TripMember.user_id == request.requester_id
        ).first()
        
        if not existing_member:
            # Add requester to trip members
            new_member = TripMember(
                trip_id=trip.id,
                user_id=request.requester_id,
                role="MEMBER",
                status="CONFIRMED"
            )
            db.add(new_member)
            
        # 8. Accept Request
        request.status = "ACCEPTED"
        request.responded_at = datetime.now(timezone.utc)
        
        # 9. If capacity reached after adding this user, update status to FULL
        new_confirmed = confirmed_count + 1
        if new_confirmed >= trip.max_passengers:
            trip.status = "FULL"
            
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transactional commit failed: {str(e)}"
        )
        
    db.refresh(request)
    return request


@router.post("/requests/{id}/reject", response_model=schemas.JoinRequestResponse)
def reject_join_request(
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject an incoming join request by the trip creator.
    """
    request = db.query(JoinRequest).filter(JoinRequest.id == id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
        
    trip = db.query(Trip).filter(Trip.id == request.trip_id).first()
    if not trip or trip.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can reject join requests."
        )
        
    if request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Join request is not pending."
        )
        
    request.status = "REJECTED"
    request.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    
    return request


@router.post("/requests/{id}/cancel", response_model=schemas.JoinRequestResponse)
def cancel_join_request(
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an outgoing pending join request by the requester.
    """
    request = db.query(JoinRequest).filter(JoinRequest.id == id).first()
    if not request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Join request not found"
        )
        
    if request.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own join requests."
        )
        
    if request.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending requests can be cancelled."
        )
        
    request.status = "CANCELLED"
    request.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(request)
    
    return request
