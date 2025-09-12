from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, decode_token
from app.crud import user as user_crud
from app.db.session import get_db
from app.schemas.user import LoginResponse, UserCreate, UserRead, TokenPair


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = user_crud.get_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    user = user_crud.create(db, email=payload.email, password=payload.password)
    return user



@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = user_crud.authenticate(db, email=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password"
        )
    access = create_access_token(subject=user.email)
    refresh = create_refresh_token(subject=user.email)
    
    return LoginResponse(
        access_token=access,
        refresh_token=refresh,
        user=user  # ORM object, Pydantic will convert via orm_mode=True
    )

@router.post("/refresh", response_model=TokenPair)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user_email = payload.get("sub")
    user = user_crud.get_by_email(db, user_email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access = create_access_token(subject=user.email)
    new_refresh = create_refresh_token(subject=user.email)
    return TokenPair(access_token=access, refresh_token=new_refresh)


