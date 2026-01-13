"""
Roommate matching models for RoomBox application
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class MatchStatus(str, enum.Enum):
    """Match status enumeration"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class SmokingPreference(str, enum.Enum):
    """Smoking preference"""
    NON_SMOKER = "non_smoker"
    SMOKER = "smoker"
    NO_PREFERENCE = "no_preference"


class StudyHabits(str, enum.Enum):
    """Study habits"""
    EARLY_BIRD = "early_bird"
    NIGHT_OWL = "night_owl"
    FLEXIBLE = "flexible"
    NO_PREFERENCE = "no_preference"


class WorkingHours(str, enum.Enum):
    """Working hours preference"""
    DAY_SHIFT = "day_shift"
    NIGHT_SHIFT = "night_shift"
    FLEXIBLE = "flexible"
    STUDENT = "student"
    NO_PREFERENCE = "no_preference"


class MatchPreference(Base):
    """
    User preferences for roommate matching
    """
    __tablename__ = "match_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # Lifestyle Preferences
    smoking_preference = Column(SQLEnum(SmokingPreference), default=SmokingPreference.NO_PREFERENCE, nullable=False)
    study_habits = Column(SQLEnum(StudyHabits), default=StudyHabits.NO_PREFERENCE, nullable=False)
    working_hours = Column(SQLEnum(WorkingHours), default=WorkingHours.NO_PREFERENCE, nullable=False)
    
    # Personality Traits (1-5 scale)
    cleanliness_level = Column(Integer, default=3, nullable=False)  # 1-5
    noise_tolerance = Column(Integer, default=3, nullable=False)  # 1-5
    social_level = Column(Integer, default=3, nullable=False)  # 1-5
    
    # Preferences
    preferred_age_range_min = Column(Integer, nullable=True)
    preferred_age_range_max = Column(Integer, nullable=True)
    preferred_gender = Column(String(20), nullable=True)  # male, female, any
    max_budget = Column(Float, nullable=True)
    
    # Additional notes
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="match_preferences")
    
    def __repr__(self):
        return f"<MatchPreference(id={self.id}, user_id={self.user_id})>"


class RoommateMatch(Base):
    """
    Roommate match model - tracks matches between users
    """
    __tablename__ = "roommate_matches"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    matched_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Match Details
    match_score = Column(Float, nullable=True)  # Compatibility score (0-100)
    status = Column(SQLEnum(MatchStatus), default=MatchStatus.PENDING, nullable=False, index=True)
    
    # Match reasons/notes
    match_reasons = Column(Text, nullable=True)  # JSON or text explaining why they matched
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="roommate_matches")
    matched_user = relationship("User", foreign_keys=[matched_user_id])
    room = relationship("Room")
    
    def __repr__(self):
        return f"<RoommateMatch(id={self.id}, user_id={self.user_id}, matched_user_id={self.matched_user_id}, score={self.match_score})>"

