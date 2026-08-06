from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.api import api_router
from app.core.config import settings

app = FastAPI(
    title="RideShare API",
    description="Backend API for travel partner discoverability and ride-sharing coordination",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
)

# CORS Configuration
# Standard secure settings loading origins from env config
# credentials=True allows HttpOnly cookie transfers
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    # Clickjacking protection
    response.headers["X-Frame-Options"] = "DENY"
    # Mime sniffing protection
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    # Content Security Policy (Basic default for JSON APIs)
    response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
    return response

# Global Exception Handler to avoid exposing stack traces
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log exception internally here if needed
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."}
    )

# Health Checks
@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy", "environment": settings.ENVIRONMENT}

@app.get("/ready", tags=["health"])
def readiness_check():
    # If we want to verify DB health as well
    try:
        from app.core.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "not_ready", "detail": "Database connection failed"})

# Include API Router
app.include_router(api_router, prefix="/api/v1")
