from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os
from pathlib import Path

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings and configuration"""
    
    # App Settings
    APP_NAME: str = "RoomBox API"
    DEBUG: bool = True
    VERSION: str = "1.0.0"
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS Settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://localhost:3002",  # Admin frontend
    ]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from string or list"""
        if isinstance(v, str):
            # Try to parse as JSON first (for .env files)
            try:
                import json
                return json.loads(v)
            except:
                # Fallback to comma-separated string
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v if isinstance(v, list) else [v]
    
    # Database Settings - PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/roombox"
    # Format: postgresql://username:password@host:port/database
    # For local development, you can use: postgresql://postgres:postgres@localhost:5432/roombox
    
    # Security Settings
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    
    class Config:
        env_file = os.path.join(BASE_DIR, ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True


# Create settings instance
settings = Settings()

