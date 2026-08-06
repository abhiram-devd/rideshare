import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Numeric,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    avatar_url = Column(String(2048), nullable=True)
    email_verified = Column(Boolean, default=False, nullable=False)
    phone_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    password_reset_hash = Column(String(255), unique=True, index=True, nullable=True)
    password_reset_expires_at = Column(DateTime(timezone=True), nullable=True)
    email_verification_hash = Column(String(255), unique=True, index=True, nullable=True)
    email_verification_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")
    created_trips = relationship("Trip", back_populates="creator", foreign_keys="[Trip.creator_id]")
    memberships = relationship("TripMember", back_populates="user", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="requester", foreign_keys="[JoinRequest.requester_id]")
    
    # Reports files
    reports_submitted = relationship("Report", back_populates="reporter", foreign_keys="[Report.reporter_id]")
    reports_received = relationship("Report", back_populates="reported_user", foreign_keys="[Report.reported_user_id]")
    
    # Blocks files
    blocks_initiated = relationship("Block", back_populates="blocker", foreign_keys="[Block.blocker_id]")
    blocks_received = relationship("Block", back_populates="blocked", foreign_keys="[Block.blocked_id]")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(255), unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_used_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    user_agent = Column(String(512), nullable=True)
    ip_address = Column(String(45), nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")


class Location(Base):
    __tablename__ = "locations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    latitude = Column(Numeric(9, 6), nullable=True)
    longitude = Column(Numeric(9, 6), nullable=True)
    location_type = Column(String(50), default="station", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)


class Trip(Base):
    __tablename__ = "trips"
    __table_args__ = (
        CheckConstraint("origin_id != destination_id", name="check_origin_dest_different"),
        CheckConstraint("max_passengers >= 1", name="check_max_passengers_min"),
        CheckConstraint("estimated_total_cost >= 0", name="check_cost_non_negative"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    origin_id = Column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("locations.id", ondelete="RESTRICT"), nullable=False)
    travel_date = Column(DateTime(timezone=True), nullable=False) # Store canonical UTC travel date/time
    time_tolerance_minutes = Column(Integer, default=30, nullable=False)
    max_passengers = Column(Integer, default=4, nullable=False)
    estimated_total_cost = Column(Numeric(10, 2), default=0.00, nullable=False)
    status = Column(String(20), default="OPEN", nullable=False) # OPEN, FULL, CANCELLED, COMPLETED
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="created_trips", foreign_keys=[creator_id])
    origin = relationship("Location", foreign_keys=[origin_id])
    destination = relationship("Location", foreign_keys=[destination_id])
    members = relationship("TripMember", back_populates="trip", cascade="all, delete-orphan")
    join_requests = relationship("JoinRequest", back_populates="trip", cascade="all, delete-orphan")


class TripMember(Base):
    __tablename__ = "trip_members"
    __table_args__ = (
        UniqueConstraint("trip_id", "user_id", name="uq_trip_member_user"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="MEMBER", nullable=False) # OWNER, MEMBER
    status = Column(String(20), default="CONFIRMED", nullable=False)
    joined_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    trip = relationship("Trip", back_populates="members")
    user = relationship("User", back_populates="memberships")


class JoinRequest(Base):
    __tablename__ = "join_requests"
    # To hold rules: creator cannot request, but duplicates check is most easily done via unique constraint or application checks
    # Let's enforce that a user only has one active request per trip
    # Statuses: PENDING, ACCEPTED, REJECTED, CANCELLED

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    requester_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="PENDING", nullable=False)
    message = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    trip = relationship("Trip", back_populates="join_requests")
    requester = relationship("User", back_populates="join_requests", foreign_keys=[requester_id])


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        CheckConstraint("reporter_id != reported_user_id", name="check_reporter_not_self"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reported_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True)
    reason = Column(String(100), nullable=False) # SPAM, NO_SHOW, HARASSMENT, VEHICLE_ISSUE, OTHER
    description = Column(String(1000), nullable=True)
    status = Column(String(20), default="PENDING", nullable=False) # PENDING, RESOLVED, DISMISSED
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    reporter = relationship("User", back_populates="reports_submitted", foreign_keys=[reporter_id])
    reported_user = relationship("User", back_populates="reports_received", foreign_keys=[reported_user_id])
    trip = relationship("Trip")


class Block(Base):
    __tablename__ = "blocks"
    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_id", name="uq_blocker_blocked"),
        CheckConstraint("blocker_id != blocked_id", name="check_block_not_self"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blocked_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Relationships
    blocker = relationship("User", back_populates="blocks_initiated", foreign_keys=[blocker_id])
    blocked = relationship("User", back_populates="blocks_received", foreign_keys=[blocked_id])
