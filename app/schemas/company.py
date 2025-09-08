from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class CompanySearchRequest(BaseModel):
    company_name: str
    search_query: Optional[str] = None


class CompanyInformationBase(BaseModel):
    company_name: str
    ai_generated_info: Optional[Dict[str, Any]] = None
    search_query: Optional[str] = None


class CompanyInformationCreate(CompanyInformationBase):
    pass


class CompanyInformationRead(CompanyInformationBase):
    id: int
    search_timestamp: datetime
    requested_by_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanySearchResponse(BaseModel):
    company_name: str
    information: Dict[str, Any]
    search_timestamp: datetime
    message: str
    search_id: int


class CompanySearchError(BaseModel):
    company_name: str
    error: str
    message: str
