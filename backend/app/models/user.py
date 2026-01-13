"""
User model for RoomBox application
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserType(str, enum.Enum):
    """User type enumeration"""
    TENANT = "tenant"
    LANDLORD = "landlord"
    ADMIN = "admin"


class User(Base):
    """
    User model representing both tenants and landlords
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    user_type = Column(SQLEnum(UserType), nullable=False, index=True)
    
    # Profile fields
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    profile_picture = Column(String(500), nullable=True)
    bio = Column(String(1000), nullable=True)
    
    # Location (for tenants looking for rooms)
    preferred_location = Column(String(255), nullable=True)
    preferred_city = Column(String(100), nullable=True)  # Kathmandu, Pokhara, etc.
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    rooms = relationship("Room", back_populates="owner", cascade="all, delete-orphan")
    roommate_matches = relationship("RoommateMatch", foreign_keys="RoommateMatch.user_id", back_populates="user")
    match_preferences = relationship("MatchPreference", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, user_type={self.user_type.value})>"

