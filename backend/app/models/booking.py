"""
Booking and Payment models
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class BookingStatus(str, enum.Enum):
    """Booking request status"""
    PENDING = "pending"  # Tenant requested booking
    APPROVED = "approved"  # Landlord approved
    REJECTED = "rejected"  # Landlord rejected
    CANCELLED = "cancelled"  # Cancelled by tenant or landlord
    COMPLETED = "completed"  # Booking completed


class PaymentStatus(str, enum.Enum):
    """Payment status"""
    PENDING = "pending"  # Payment initiated but not completed
    COMPLETED = "completed"  # Payment successful
    FAILED = "failed"  # Payment failed
    REFUNDED = "refunded"  # Payment refunded


class TenancyStatus(str, enum.Enum):
    """Tenancy status - tracks tenant lifecycle"""
    PENDING = "pending"  # Tenant selected but not yet active
    ACTIVE = "active"  # Current tenant living in the property
    COMPLETED = "completed"  # Tenancy finished normally
    TERMINATED = "terminated"  # Ended early by landlord or tenant


class Booking(Base):
    """
    Booking model - represents a booking request from tenant to landlord
    """
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    landlord_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Booking details
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)  # None for indefinite
    monthly_rent = Column(Float, nullable=False)
    security_deposit = Column(Float, nullable=True)
    advance_payment = Column(Float, nullable=True)
    
    # Status
    status = Column(SQLEnum(BookingStatus), default=BookingStatus.PENDING, nullable=False, index=True)
    tenancy_status = Column(SQLEnum(TenancyStatus), default=TenancyStatus.PENDING, nullable=True, index=True)
    
    # Message/Notes
    tenant_message = Column(Text, nullable=True)
    landlord_response = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    tenant = relationship("User", foreign_keys=[tenant_id], backref="bookings_as_tenant")
    landlord = relationship("User", foreign_keys=[landlord_id], backref="bookings_as_landlord")
    room = relationship("Room", backref="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")


class Payment(Base):
    """
    Payment model - tracks payments for bookings
    """
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    landlord_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Payment details
    amount = Column(Float, nullable=False)
    payment_type = Column(String(50), nullable=False)  # 'rent', 'security_deposit', 'advance', 'refund'
    payment_month = Column(String(20), nullable=True)  # Format: "YYYY-MM" for monthly rent
    description = Column(Text, nullable=True)
    
    # eSewa payment details
    transaction_uuid = Column(String(255), unique=True, nullable=True, index=True)
    esewa_ref_id = Column(String(255), nullable=True, index=True)
    esewa_signature = Column(String(500), nullable=True)
    
    # Status
    status = Column(SQLEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    booking = relationship("Booking", back_populates="payments")
    tenant = relationship("User", foreign_keys=[tenant_id], backref="payments_as_tenant")
    landlord = relationship("User", foreign_keys=[landlord_id], backref="payments_as_landlord")

