import os
from datetime import datetime
from fastapi import APIRouter

router = APIRouter(tags=["System"])

@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify backend status and connectivity.
    """
    return {
        "status": "healthy",
        "message": "ResearchHub Backend is running",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": os.getenv("ENV", "development"),
        "version": "1.0.0"
    }
