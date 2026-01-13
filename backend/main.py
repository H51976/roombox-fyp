from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from app.middleware.error_handler import setup_error_handlers
from app.middleware.request_logger import RequestLoggerMiddleware
from app.config import settings
from app.api.v1 import router as api_router
from app.utils.init_admin import init_admin_user
from app.socketio_server import socketio_app, sio

# Initialize FastAPI app
app = FastAPI(
    title="RoomBox API",
    description="Digital room-finder and roommate-matching platform API for Nepal's urban rental market",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc",  # ReDoc alternative
    openapi_url="/openapi.json"
)

# Mount Socket.IO app
app.mount("/socket.io", socketio_app)

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Add custom middleware
app.add_middleware(RequestLoggerMiddleware)

# Setup error handlers
setup_error_handlers(app)

# Include API routes
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Initialize admin user on application startup"""
    init_admin_user()


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to RoomBox API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "RoomBox API"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )

