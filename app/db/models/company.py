from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base


class CompanyInformation(Base):
    __tablename__ = "company_information"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    ai_generated_info = Column(JSON, nullable=True)
    search_query = Column(Text, nullable=True)
    search_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_by = relationship("User", backref="company_searches")

    pitch_deck_url = Column(Text, nullable=True)
    benchmark_status = Column(Text, nullable=True)
    benchmark_info = Column(Text, nullable=True)
    dealnote_info = Column(Text, nullable=True)
    deal_notes_status = Column(Text, nullable=True) 
    benchmark_job_id = Column(Text, nullable=True)
    deal_notes_job_id = Column(Text, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
