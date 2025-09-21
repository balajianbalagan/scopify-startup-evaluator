from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class CompanyMinimal(BaseModel):
    id: int
    company_name: str
    pitchdeck_url: str | None = None

    class Config:
        from_attributes = True

class CompanySearchRequest(BaseModel):
    company_name: str
    search_query: Optional[str] = None


class CompanyInformationBase(BaseModel):
    company_name: str
    ai_generated_info: Optional[Dict[str, Any]] = None
    search_query: Optional[str] = None
    pitch_deck_url: Optional[str] = None
    benchmark_status: Optional[str] = None
    benchmark_info: Optional[str] = None
    dealnote_info: Optional[str] = None
    deal_notes_status: Optional[str] = None
    benchmark_job_id: Optional[str] = None
    deal_notes_job_id: Optional[str] = None  


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
