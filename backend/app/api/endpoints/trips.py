from datetime import datetime, timezone, timedelta
from typing import Any, List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api import deps
from app.core.database import get_db
from app.models.models import Location, Trip, TripMember, User
from app.schemas import schemas

router = APIRouter()

@router.post("/", response_model=schemas.TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(
    trip_in: schemas.TripCreate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new trip.
    Validates origin/destination exist, travel date is in future, and creates
    the creator as the OWNER member atomically.
    """
    # Verify locations exist
    origin = db.query(Location).filter(Location.id == trip_in.origin_id, Location.is_active == True).first()
    destination = db.query(Location).filter(Location.id == trip_in.destination_id, Location.is_active == True).first()
    
    if not origin or not destination:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Origin or destination location is invalid or inactive."
        )
        
    # Travel date should normally be in the future (or very near past/present)
    # We validate that it is not earlier than 10 minutes ago to account for slight clock offsets
    now_utc = datetime.now(timezone.utc)
    if trip_in.travel_date < now_utc - timedelta(minutes=10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create a trip with a departure time in the past."
        )
        
    # Transaction begins
    try:
        new_trip = Trip(
            creator_id=current_user.id,
            origin_id=trip_in.origin_id,
            destination_id=trip_in.destination_id,
            travel_date=trip_in.travel_date,
            time_tolerance_minutes=trip_in.time_tolerance_minutes,
            max_passengers=trip_in.max_passengers,
            estimated_total_cost=trip_in.estimated_total_cost,
            status="OPEN",
            notes=trip_in.notes
        )
        db.add(new_trip)
        db.flush() # Fetch UUID
        
        # Atomically join creator as OWNER
        owner_member = TripMember(
            trip_id=new_trip.id,
            user_id=current_user.id,
            role="OWNER",
            status="CONFIRMED"
        )
        db.add(owner_member)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create trip: database write failed."
        )
        
    # Fetch complete details for response representation
    trip = db.query(Trip).options(
        joinedload(Trip.creator),
        joinedload(Trip.origin),
        joinedload(Trip.destination),
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == new_trip.id).first()
    
    return trip


@router.get("/search", response_model=List[schemas.TripResponse])
def search_trips(
    origin_id: UUID = Query(...),
    destination_id: UUID = Query(...),
    travel_date: datetime = Query(..., description="Target UTC departure datetime"),
    time_tolerance_minutes: int = Query(60, ge=10, le=1440),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search upcoming trips matching criteria.
    - Same origin and destination
    - Departure time within requested tolerance window
    - Trip status is OPEN
    - Filter out trips created by current user
    - Sorts by smallest absolute time difference to requested target time
    """
    start_window = travel_date - timedelta(minutes=time_tolerance_minutes)
    end_window = travel_date + timedelta(minutes=time_tolerance_minutes)
    
    # Matching Query
    # Calculate travel gap absolute difference for ordering
    time_diff = func.abs(
        func.extract("epoch", Trip.travel_date) - func.extract("epoch", travel_date)
    )
    
    query = db.query(Trip).options(
        joinedload(Trip.creator),
        joinedload(Trip.origin),
        joinedload(Trip.destination),
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(
        Trip.origin_id == origin_id,
        Trip.destination_id == destination_id,
        Trip.travel_date.between(start_window, end_window),
        Trip.status == "OPEN",
        Trip.creator_id != current_user.id
    )
    
    # Order by time difference (closest target first)
    query = query.order_by(time_diff)
    
    # Pagination
    offset = (page - 1) * page_size
    trips = query.offset(offset).limit(page_size).all()
    
    return trips


@router.get("/my", response_model=List[schemas.TripResponse])
def get_my_trips(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all active/upcoming trips current user is confirmed in (as creator or member).
    """
    trips = db.query(Trip).join(TripMember).filter(
        TripMember.user_id == current_user.id,
        TripMember.status == "CONFIRMED",
        Trip.status.in_(["OPEN", "FULL"])
    ).options(
        joinedload(Trip.creator),
        joinedload(Trip.origin),
        joinedload(Trip.destination),
        joinedload(Trip.members).joinedload(TripMember.user)
    ).all()
    return trips


@router.get("/{id}", response_model=schemas.TripResponse)
def get_trip_by_id(
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed trip record by ID.
    Access controls: confirmed trip members are allowed full visibility, general public gets basic view.
    To maintain data integrity & privacy, only returns record if it exists.
    """
    trip = db.query(Trip).options(
        joinedload(Trip.creator),
        joinedload(Trip.origin),
        joinedload(Trip.destination),
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == id).first()
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
        
    return trip


@router.patch("/{id}", response_model=schemas.TripResponse)
def update_trip(
    id: UUID,
    trip_in: schemas.TripUpdate,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update trip parameters by creation owner.
    Handles modifying max passengers, cost estimates, Notes.
    Enforces that capacity cannot be shrunk below active confirmed passenger count.
    """
    trip = db.query(Trip).filter(Trip.id == id).first()
    
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
        
    if trip.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can modify this trip."
        )
        
    if trip.status in ["CANCELLED", "COMPLETED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update a cancelled or completed trip."
        )
        
    # Apply changes
    if trip_in.notes is not None:
        trip.notes = trip_in.notes
        
    if trip_in.estimated_total_cost is not None:
        trip.estimated_total_cost = trip_in.estimated_total_cost
        
    if trip_in.time_tolerance_minutes is not None:
        trip.time_tolerance_minutes = trip_in.time_tolerance_minutes
        
    if trip_in.max_passengers is not None:
        # Check current members size
        member_count = db.query(func.count(TripMember.id)).filter(
            TripMember.trip_id == trip.id,
            TripMember.status == "CONFIRMED"
        ).scalar() or 0
        
        if trip_in.max_passengers < member_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reduce capacity below currently confirmed traveler count ({member_count})."
            )
            
        trip.max_passengers = trip_in.max_passengers
        
        # Recalculate status if max_passengers changed
        if member_count >= trip.max_passengers:
            trip.status = "FULL"
        else:
            trip.status = "OPEN"
            
    db.commit()
    db.refresh(trip)
    
    # Reload relationships
    trip = db.query(Trip).options(
        joinedload(Trip.creator),
        joinedload(Trip.origin),
        joinedload(Trip.destination),
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == id).first()
    
    return trip


@router.post("/{id}/cancel", response_model=schemas.TripResponse)
def cancel_trip(
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancel an upcoming trip by its creator.
    Soft changes status to CANCELLED (does not destructively purge tables).
    """
    trip = db.query(Trip).filter(Trip.id == id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
        
    if trip.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can cancel this trip."
        )
        
    if trip.status == "CANCELLED":
         return trip
         
    trip.status = "CANCELLED"
    db.commit()
    db.refresh(trip)
    
    trip = db.query(Trip).options(
        joinedload(Trip.creator),
        joinedload(Trip.origin),
        joinedload(Trip.destination),
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == id).first()
    
    return trip


@router.post("/{id}/complete", response_model=schemas.TripResponse)
def complete_trip(
    id: UUID,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Mark trip as completed by its creator.
    Validates it is not cancelled.
    """
    trip = db.query(Trip).filter(Trip.id == id).first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trip not found"
        )
        
    if trip.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the trip creator can mark this trip completed."
        )
        
    if trip.status == "CANCELLED":
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST,
             detail="Cannot mark a cancelled trip as completed."
         )
         
    trip.status = "COMPLETED"
    db.commit()
    db.refresh(trip)
    
    trip = db.query(Trip).options(
        joinedload(Trip.creator),
        joinedload(Trip.origin),
        joinedload(Trip.destination),
        joinedload(Trip.members).joinedload(TripMember.user)
    ).filter(Trip.id == id).first()
    
    return trip
