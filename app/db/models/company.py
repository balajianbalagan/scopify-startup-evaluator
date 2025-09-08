from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.db.base import Base


class CompanyInformation(Base):
    __tablename__ = "company_information"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False, index=True)
    ai_generated_info = Column(JSON, nullable=True)  # Store the AI response as JSON
    search_query = Column(Text, nullable=True)  # Store the original search query
    search_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Foreign key to the user who requested the information
    requested_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requested_by = relationship("User", backref="company_searches")
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
