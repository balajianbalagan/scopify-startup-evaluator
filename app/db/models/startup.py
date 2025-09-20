from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship

from app.db.base import Base


class StartupStatus(str, Enum):
    ACTIVE = "active"
    EARLY_STAGE = "early_stage"
    SOLD = "sold"
    FAILED = "failed"


class Startup(Base):
    __tablename__ = "startups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    website = Column(String(500), nullable=True)
    status = Column(SQLEnum(StartupStatus), nullable=False, default=StartupStatus.ACTIVE)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    leading_investor = Column(String(255), nullable=True)  # Leading Investor
    industry = Column(String(255), nullable=True)
    is_unicorn = Column(Boolean, default=False, nullable=False)
    founded_year = Column(Integer, nullable=True)
    number_of_employees = Column(Integer, nullable=True)
    sub_categories = Column(Text, nullable=True)  # JSON string for list of sub categories
    
    # Relationships
    document_analyses = relationship("DocumentAnalysis", back_populates="startup")
    founders = Column(Text, nullable=True)  # JSON string for list of founders
    total_funding_raised = Column(Float, nullable=True)
    funding_stage = Column(String(100), nullable=True)  # e.g., Seed, Series A, Series B, etc.
    total_valuation = Column(Float, nullable=True)
    additional_information = Column(Text, nullable=True)
    investors = Column(Text, nullable=True)  # JSON string for list of investors
    funding_rounds = Column(Text, nullable=True)  # JSON string for list of funding rounds
    latest_news = Column(Text, nullable=True)
    social_media_links = Column(Text, nullable=True)  # JSON string for social media links
    tam = Column(Float, nullable=True)  # Total Addressable Market
    arr = Column(Float, nullable=True)  # Annual Recurring Revenue
    product = Column(Text, nullable=True)
    challenges = Column(Text, nullable=True)
    differentiator = Column(Text, nullable=True)
    competitors = Column(Text, nullable=True)  # JSON string for list of competitors

    pitch_deck_url = Column(String(500), nullable=True)  # Pitch deck file URL
    raw_data = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class StartupEvaluation(Base):
    __tablename__ = "startup_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    evaluation_status = Column(String(50), default="pending", nullable=False)  # pending, approved, rejected
    evaluation_score = Column(Integer, nullable=True)  # 1-10 scale
    evaluation_notes = Column(Text, nullable=True)
    partner_notes = Column(Text, nullable=True)
    is_approved = Column(Boolean, default=False, nullable=False)
    
    # Foreign key to the partner who submitted the evaluation
    partner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    partner = relationship("User", foreign_keys=[partner_id], backref="evaluations")
    
    # Admin who reviewed (if any)
    reviewed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_id], backref="reviewed_evaluations")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class FailedStartup(Base):
    __tablename__ = "failed_startups"

    id = Column(Integer, primary_key=True, index=True)
    startup_id = Column(Integer, ForeignKey("startups.id"), nullable=False, unique=True)
    failure_reason = Column(Text, nullable=True)
    takeaway = Column(Text, nullable=True)
    
    # Relationship to Startup
    startup = relationship("Startup", backref="failure_details")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

