from pydantic import BaseModel
from typing import Optional
from datetime import datetime
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

