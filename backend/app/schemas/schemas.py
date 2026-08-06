from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# --- Auth & User Schemas ---

class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full name of the user")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100, description="Password, min 8 characters")
    phone: Optional[str] = Field(None, max_length=20, description="Optional phone number")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower().strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    email_verified: bool
    phone_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.lower().strip()


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class ProfileEditRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=2048)


# --- Location Schemas ---

class LocationResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    location_type: str
    is_active: bool

    class Config:
        from_attributes = True


# --- Trip & Members Schemas ---

class TripCreate(BaseModel):
    origin_id: UUID
    destination_id: UUID
    travel_date: datetime = Field(..., description="Canonical travel date and departure time (UTC)")
    time_tolerance_minutes: int = Field(30, ge=10, le=1440, description="Time flexibility in minutes")
    max_passengers: int = Field(4, ge=1, le=100, description="Max passenger limit")
    estimated_total_cost: Decimal = Field(..., ge=0, decimal_places=2, description="Estimated total fare")
    notes: Optional[str] = Field(None, max_length=1000)

    @model_validator(mode="after")
    def validate_trip_endpoints(self) -> 'TripCreate':
        if self.origin_id == self.destination_id:
            raise ValueError("Origin and destination locations cannot be identical.")
        return self


class TripUpdate(BaseModel):
    notes: Optional[str] = Field(None, max_length=1000)
    time_tolerance_minutes: Optional[int] = Field(None, ge=10, le=1440)
    max_passengers: Optional[int] = Field(None, ge=1, le=100)
    estimated_total_cost: Optional[Decimal] = Field(None, ge=0, decimal_places=2)


class TripMemberResponse(BaseModel):
    id: UUID
    trip_id: UUID
    user_id: UUID
    user: UserResponse
    role: str
    status: str
    joined_at: datetime

    class Config:
        from_attributes = True


class TripResponse(BaseModel):
    id: UUID
    creator_id: UUID
    creator: UserResponse
    origin: LocationResponse
    destination: LocationResponse
    travel_date: datetime
    time_tolerance_minutes: int
    max_passengers: int
    estimated_total_cost: Decimal
    status: str
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    members: List[TripMemberResponse] = []

    class Config:
        from_attributes = True


class TripMatchQuery(BaseModel):
    origin_id: UUID
    destination_id: UUID
    travel_date: datetime
    time_tolerance_minutes: Optional[int] = 60
    page: int = Field(1, ge=1)
    page_size: int = Field(10, ge=1, le=100)


# --- Join Requests Schemas ---

class JoinRequestCreate(BaseModel):
    message: Optional[str] = Field(None, max_length=500)


class JoinRequestResponse(BaseModel):
    id: UUID
    trip_id: UUID
    requester_id: UUID
    requester: UserResponse
    status: str
    message: Optional[str]
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Safety (Block / Report) ---

class ReportCreate(BaseModel):
    reported_user_id: UUID
    trip_id: Optional[UUID] = None
    reason: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)


class ReportResponse(BaseModel):
    id: UUID
    reporter_id: UUID
    reported_user_id: UUID
    trip_id: Optional[UUID]
    reason: str
    description: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class BlockCreate(BaseModel):
    blocked_id: UUID


class BlockResponse(BaseModel):
    id: UUID
    blocker_id: UUID
    blocked_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
