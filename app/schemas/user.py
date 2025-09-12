from pydantic import BaseModel, EmailStr
from typing import Optional
from app.db.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    role: UserRole = UserRole.PARTNER


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: Optional[UserRole] = UserRole.PARTNER


class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    type: str


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserRoleUpdateResponse(BaseModel):
    id: int
    email: str
    role: UserRole
    message: str


class AvailableRolesResponse(BaseModel):
    available_roles: list[str]
    current_user_role: UserRole

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserRead
