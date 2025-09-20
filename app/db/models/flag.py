from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FlagBase(BaseModel):
    company_id: int
    flag_type: str
    flag_value: Optional[str] = None


class FlagCreate(FlagBase):
    pass


class FlagUpdate(BaseModel):
    flag_type: Optional[str] = None
    flag_value: Optional[str] = None


class FlagRead(FlagBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
