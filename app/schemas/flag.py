from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base


class CompanyFlag(Base):
    __tablename__ = "company_flags"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("company_information.id"), nullable=False)

    flag_type = Column(String(50), nullable=False)  # "data_missing" or "risk"
    risk_level = Column(String(20), default="low")  # high, medium, low
    flag_description = Column(Text, nullable=False)
    status = Column(String(30), default="raised")  # raised, awaiting_response, closed, closed_incomplete

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship back to company
    company = relationship("CompanyInformation", backref="flags")
