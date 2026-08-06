import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.database import get_db
from app.models.models import AuthSession, User
from app.schemas import schemas

router = APIRouter()

def set_refresh_cookie(response: Response, refresh_token: str):
    """Utility to set HttpOnly refresh token cookie on response."""
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/api/v1/auth", # secure to path scope
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

def clear_refresh_cookie(response: Response):
    """Utility to remove refresh token cookie."""
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
    )

@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: schemas.UserRegister,
    db: Session = Depends(get_db)
):
    """
    Register a new user to the platform.
    Normalizes email, checks constraint, hashes password.
    """
    # Normalize email
    normalized_email = user_in.email.lower().strip()
    
    # Check duplicate
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
        
    hashed_pw = security.get_password_hash(user_in.password)
    new_user = User(
        name=user_in.name,
        email=normalized_email,
        phone=user_in.phone,
        password_hash=hashed_pw,
        email_verified=False,
        phone_verified=False,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(
    response: Response,
    request: Request,
    credentials: schemas.UserLogin,
    db: Session = Depends(get_db)
):
    """
    Log in with email and password.
    Returns access token, sets long-lived secure HttpOnly refresh token cookie.
    """
    user = db.query(User).filter(User.email == credentials.email.lower().strip()).first()
    if not user or not user.is_active or not security.verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
        
    # Generate tokens
    jti = security.generate_jti()
    access_token = security.create_access_token(subject=str(user.id))
    raw_refresh, refresh_hash = security.create_refresh_token(subject=str(user.id), jti=jti)
    
    # Save Refresh Session in DB
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    session = AuthSession(
        id=jti,
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        last_used_at=datetime.now(timezone.utc),
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None
    )
    
    db.add(session)
    db.commit()
    
    set_refresh_cookie(response, raw_refresh)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh", response_model=schemas.Token)
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Rotates the refresh token and returns a new short-lived access token.
    Uses refresh token from cookies, validates, and rotates.
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing"
        )
        
    try:
        payload = security.decode_token(refresh_token, expected_type="refresh")
        user_id = payload.get("sub")
        jti = payload.get("jti")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token structure"
        )
        
    token_hash = security.hash_refresh_token(refresh_token)
    
    # Query matching session
    session = db.query(AuthSession).filter(AuthSession.token_hash == token_hash).first()
    
    if not session:
        # Token not found but payload valid implies possible Token Reuse / Theft!
        # Revoke all sessions for safety if user_id extracted
        if user_id:
            db.query(AuthSession).filter(AuthSession.user_id == user_id).delete()
            db.commit()
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Breach detected: session revoked"
        )
        
    if session.revoked_at or session.expires_at < datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session expired or revoked"
        )
        
    # Rotate refresh session
    new_jti = security.generate_jti()
    new_access_token = security.create_access_token(subject=str(session.user_id))
    new_raw_refresh, new_refresh_hash = security.create_refresh_token(subject=str(session.user_id), jti=new_jti)
    
    # Update active session in DB with rotated token details
    session.token_hash = new_refresh_hash
    session.id = new_jti
    session.last_used_at = datetime.now(timezone.utc)
    session.expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    db.commit()
    
    set_refresh_cookie(response, new_raw_refresh)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Log out. Deletes active session from DB and clears refresh cookie.
    """
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        token_hash = security.hash_refresh_token(refresh_token)
        db.query(AuthSession).filter(AuthSession.token_hash == token_hash).delete()
        db.commit()
        
    clear_refresh_cookie(response)
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: User = Depends(deps.get_current_user)):
    """Return authenticated user profile data."""
    return current_user


@router.patch("/me", response_model=schemas.UserResponse)
def update_me(
    profile: schemas.ProfileEditRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Update the authenticated user's editable profile fields."""
    if profile.name is not None:
        current_user.name = profile.name
    if profile.phone is not None:
        current_user.phone = profile.phone
    if profile.avatar_url is not None:
        current_user.avatar_url = profile.avatar_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(
    req: schemas.ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Initiate password reset.
    Generates single-use token, stores hash with short 1 hr expiry.
    Logs reset url to console (email simulation).
    """
    normalized_email = req.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()
    
    # Do not reveal whether account exists in API output
    if not user:
        return {"message": "If this email is registered, a password reset link will be sent shortly."}
        
    reset_token = secrets.token_urlsafe(32)
    token_hash = security.hash_refresh_token(reset_token) # SHA256 matches refresh token hashing strength
    
    user.password_reset_hash = token_hash
    user.password_reset_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    db.commit()
    
    # Log reset URL to terminal console
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    print(f"\n[DEVELOPMENT EMAIL SINK] Password Reset requested for {user.email}. URL: {reset_url}\n")
    
    return {"message": "If this email is registered, a password reset link will be sent shortly."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    req: schemas.ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Confirm password reset.
    Validates token hash, updates password, and invalidates all existing sessions (forces relogin).
    """
    token_hash = security.hash_refresh_token(req.token)
    user = db.query(User).filter(
        User.password_reset_hash == token_hash,
        User.password_reset_expires_at > datetime.now(timezone.utc)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    # Reset fields and update password
    user.password_hash = security.get_password_hash(req.new_password)
    user.password_reset_hash = None
    user.password_reset_expires_at = None
    
    # Invalidate other sessions
    db.query(AuthSession).filter(AuthSession.user_id == user.id).delete()
    db.commit()
    
    return {"message": "Password successfully reset. Please log in with your new password."}
