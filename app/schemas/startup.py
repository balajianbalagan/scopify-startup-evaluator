import json
from pydantic import BaseModel, Field, validator
from typing import Any, Dict, List, Optional
from datetime import datetime
from app.db.models.startup import StartupStatus
from app.db.models.user import UserRole


class StartupEvaluationBase(BaseModel):
    company_name: str
    partner_notes: Optional[str] = None


class StartupEvaluationCreate(StartupEvaluationBase):
    pass


class StartupEvaluationUpdate(BaseModel):
    evaluation_status: Optional[str] = None
    evaluation_score: Optional[int] = None
    evaluation_notes: Optional[str] = None
    is_approved: Optional[bool] = None


class StartupEvaluationRead(StartupEvaluationBase):
    id: int
    evaluation_status: str
    evaluation_score: Optional[int]
    evaluation_notes: Optional[str]
    is_approved: bool
    partner_id: int
    reviewed_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StartupEvaluationResponse(BaseModel):
    company_name: str
    evaluation_status: str
    message: str
    score: Optional[int] = None
    notes: Optional[str] = None

class StartupCreate(BaseModel):
    name: str = Field(..., max_length=255)
    website: Optional[str] = Field(None, max_length=500)
    status: Optional[StartupStatus] = StartupStatus.ACTIVE
    location: Optional[str] = None
    description: Optional[str] = None
    leading_investor: Optional[str] = None
    industry: Optional[str] = None
    is_unicorn: Optional[bool] = False
    founded_year: Optional[int] = None
    number_of_employees: Optional[int] = None
    sub_categories: Optional[List[str]] = None
    founders: Optional[List[str]] = None
    total_funding_raised: Optional[float] = None
    funding_stage: Optional[str] = None
    total_valuation: Optional[float] = None
    additional_information: Optional[str] = None
    investors: Optional[List[str]] = None
    funding_rounds: Optional[List[str]] = None
    latest_news: Optional[str] = None
    social_media_links: Optional[Dict[str, str]] = None
    tam: Optional[float] = None
    arr: Optional[float] = None
    product: Optional[str] = None
    challenges: Optional[str] = None
    differentiator: Optional[str] = None
    competitors: Optional[List[str]] = None

    class Config:
        orm_mode = True


class StartupRead(BaseModel):
    id: int
    name: str
    website: Optional[str]
    status: StartupStatus
    location: Optional[str]
    description: Optional[str]
    leading_investor: Optional[str]
    industry: Optional[str]
    is_unicorn: bool
    founded_year: Optional[int]
    number_of_employees: Optional[int]
    sub_categories: Optional[List[str]]
    founders: Optional[List[str]]
    total_funding_raised: Optional[float]
    funding_stage: Optional[str]
    total_valuation: Optional[float]
    additional_information: Optional[str]
    investors: Optional[List[str]]
    funding_rounds: Optional[List[str]]
    latest_news: Optional[str]
    social_media_links: Optional[Dict[str, str]]
    tam: Optional[float]
    arr: Optional[float]
    product: Optional[str]
    challenges: Optional[str]
    differentiator: Optional[str]
    competitors: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

    @validator(
        "sub_categories",
        "founders",
        "investors",
        "funding_rounds",
        "competitors",
        pre=True,
    )
    def parse_json_list(cls, v: Any):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v

    @validator("social_media_links", pre=True)
    def parse_json_dict(cls, v: Any):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return {}
        return v

    class Config:
        orm_mode = True