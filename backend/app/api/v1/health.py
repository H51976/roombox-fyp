from fastapi import APIRouter
from app.utils.response import success_response

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint for API monitoring
    """
    return success_response(
        data={
            "status": "healthy",
            "service": "RoomBox API",
            "version": "1.0.0"
        },
        message="Service is running"
    )

