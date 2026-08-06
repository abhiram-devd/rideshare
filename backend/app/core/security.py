import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Tuple, Union
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from app.core.config import settings

# Initialize Argon2 Password Hasher
# Using default parameters which are standard and secure
ph = PasswordHasher()

def get_password_hash(password: str) -> str:
    """Hash a password using Argon2id."""
    return ph.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False

def hash_refresh_token(token: str) -> str:
    """Create a secure SHA256 hash of a refresh token to store in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def generate_jti() -> str:
    """Generate a unique JWT ID/Session ID."""
    return secrets.token_hex(16)

def create_jwt_token(
    subject: str,
    expires_delta: timedelta,
    token_type: str,
    jti: str = None
) -> str:
    """Create a JWT token (access or refresh) with appropriate standard claims."""
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    
    claims = {
        "sub": subject,
        "iat": now,
        "exp": expire,
        "type": token_type,
    }
    
    if jti:
        claims["jti"] = jti
        
    return jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm="HS256")

def create_access_token(subject: str) -> str:
    """Create a short-lived access token."""
    expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_jwt_token(subject=subject, expires_delta=expires, token_type="access")

def create_refresh_token(subject: str, jti: str) -> Tuple[str, str]:
    """
    Create a long-lived refresh token and its hash for database storage.
    Returns: (raw_refresh_token_jwt, token_hash)
    """
    expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    raw_token = create_jwt_token(subject=subject, expires_delta=expires, token_type="refresh", jti=jti)
    token_hash = hash_refresh_token(raw_token)
    return raw_token, token_hash

def decode_token(token: str, expected_type: str) -> Dict[str, Any]:
    """
    Decodes and validates a JWT.
    Raises jwt.PyJWTError if invalid.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=["HS256"],
        options={"require": ["exp", "sub", "iat", "type"]}
    )
    
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError("Token type mismatch")
        
    return payload
