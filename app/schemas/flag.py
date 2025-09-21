from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.company import CompanyInformationRead
from app.schemas.company import CompanyMinimal

class FlagBase(BaseModel):
    company_id: int
    flag_type: str
    risk_level: Optional[str] = "low"
    flag_description: str
    status: Optional[str] = "raised"


class FlagCreate(FlagBase):
    pass


class FlagUpdate(BaseModel):
    flag_type: Optional[str] = None
    risk_level: Optional[str] = None
    flag_description: Optional[str] = None
    status: Optional[str] = None


class FlagRead(FlagBase):
    id: int
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyWithFlags(BaseModel):
    company: CompanyMinimal
    flags: List[FlagRead]

    model_config = ConfigDict(from_attributes=True)
