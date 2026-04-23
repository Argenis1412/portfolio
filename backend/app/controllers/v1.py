"""
Router API v1.

Groups all endpoints for version 1 of the API.
Prefix: /api/v1
"""

from fastapi import APIRouter

from app.controllers import api, chaos, contact

# Main v1 router
router_v1 = APIRouter(
    prefix="/v1",
    tags=["API v1"],

@router_v1.get("/")
async def v1_root():
    """
    Root of API v1.
    """
    return {
        "status": "ok",
        "message": "Welcome to Portfolio API v1",
        "version": "1.0.0",
    }


# Include routers from different domains
router_v1.include_router(api.router, tags=["Portfolio"])
router_v1.include_router(contact.router, tags=["Contact"])
router_v1.include_router(chaos.router, tags=["Chaos Playground"])


__all__ = ["router_v1"]
