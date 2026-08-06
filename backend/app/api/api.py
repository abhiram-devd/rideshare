from fastapi import APIRouter

from app.api.endpoints import auth, locations, trips, requests, reports, blocks

api_router = APIRouter()

# Authentication & Users
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Predefined locations
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])

# Trips core CRUD
api_router.include_router(trips.router, prefix="/trips", tags=["trips"])

# Join Requests (mount without prefix as internal routing handles prefixes)
api_router.include_router(requests.router, tags=["requests"])

# Safety reporting/blocking
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(blocks.router, prefix="/blocks", tags=["blocks"])
