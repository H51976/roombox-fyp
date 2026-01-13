from fastapi import APIRouter
from app.api.v1 import auth, health, rooms, chat, booking

router = APIRouter()

# Include sub-routers
router.include_router(health.router, tags=["Health"])
router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
router.include_router(rooms.router, prefix="/rooms", tags=["Rooms"])
router.include_router(chat.router, prefix="/chat", tags=["Chat"])
router.include_router(booking.router, prefix="/bookings", tags=["Bookings"])

