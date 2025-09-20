from sqlalchemy import Column, String, JSON, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class DocumentAnalysis(Base):
    __tablename__ = "document_analysis"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String, index=True)
    file_type = Column(String)
    analysis_timestamp = Column(DateTime, default=datetime.utcnow)
    raw_data = Column(JSON)  # Stores the complete Vision API response

    # Processed data fields
    company_name = Column(String, index=True)
    industry = Column(String, index=True)
    founding_year = Column(Integer)
    company_stage = Column(String)
    key_products = Column(JSON)  # Array of products/services
    target_market = Column(String)
    competitive_advantage = Column(String)
    revenue_model = Column(String)
    funding_status = Column(String)
    team_size = Column(Integer)

    # ✅ Foreign Key to Startup
    startup_id = Column(Integer, ForeignKey("startups.id"), nullable=True)

    # ✅ Relationship back to Startup
    startup = relationship("Startup", back_populates="document_analyses")

    # Processing status
    processing_status = Column(String, default="pending")  # pending, completed, failed
    error_message = Column(String, nullable=True)