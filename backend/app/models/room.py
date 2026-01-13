"""
Room/Property models for RoomBox application
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class RoomType(str, enum.Enum):
    """Room type enumeration"""
    SINGLE = "single"
    DOUBLE = "double"
    SHARED = "shared"
    APARTMENT = "apartment"
    FLAT = "flat"
    HOUSE = "house"


class FurnishingStatus(str, enum.Enum):
    """Furnishing status enumeration"""
    FURNISHED = "furnished"
    SEMI_FURNISHED = "semi_furnished"
    UNFURNISHED = "unfurnished"


class RoomStatus(str, enum.Enum):
    """Room/Property status"""
    AVAILABLE = "available"  # Property is open for booking / new tenant
    OCCUPIED = "occupied"  # Currently rented by a tenant
    RESERVED = "reserved"  # Booked but tenant has not moved in yet
    UNDER_MAINTENANCE = "under_maintenance"  # Temporarily unavailable due to repair/renovation
    INACTIVE = "inactive"  # Property is not listed / disabled by landlord


class Room(Base):
    """
    Room/Property model for listings
    """
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Basic Information
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    room_type = Column(SQLEnum(RoomType), nullable=False, index=True)
    
    # Location
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False, index=True)  # Kathmandu, Pokhara, etc.
    ward_number = Column(String(20), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Pricing
    price_per_month = Column(Float, nullable=False, index=True)
    security_deposit = Column(Float, nullable=True)
    advance_payment = Column(Float, nullable=True)
    
    # Room Details
    total_rooms = Column(Integer, nullable=False, default=1)
    available_rooms = Column(Integer, nullable=False, default=1)
    bathrooms = Column(Integer, nullable=False, default=1)
    floor_number = Column(Integer, nullable=True)
    total_floors = Column(Integer, nullable=True)
    area_sqft = Column(Float, nullable=True)
    
    # Amenities
    furnishing_status = Column(SQLEnum(FurnishingStatus), nullable=True)
    has_kitchen = Column(Boolean, default=False, nullable=False)
    has_parking = Column(Boolean, default=False, nullable=False)
    has_wifi = Column(Boolean, default=False, nullable=False)
    has_water_supply = Column(Boolean, default=True, nullable=False)
    has_electricity = Column(Boolean, default=True, nullable=False)
    has_security = Column(Boolean, default=False, nullable=False)
    has_elevator = Column(Boolean, default=False, nullable=False)
    has_balcony = Column(Boolean, default=False, nullable=False)
    
    # Status
    status = Column(SQLEnum(RoomStatus), default=RoomStatus.AVAILABLE, nullable=False, index=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="rooms")
    images = relationship("RoomImage", back_populates="room", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Room(id={self.id}, title={self.title}, city={self.city}, price={self.price_per_month})>"


class RoomImage(Base):
    """
    Room images model
    """
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    image_url = Column(Text, nullable=False)  # Changed to Text to support base64 images
    image_order = Column(Integer, default=0, nullable=False)  # For ordering images
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    room = relationship("Room", back_populates="images")
    
    def __repr__(self):
        return f"<RoomImage(id={self.id}, room_id={self.room_id}, is_primary={self.is_primary})>"

