from typing import Optional, List

from sqlalchemy.orm import Session

from app.db.models.user import User
from app.core.security import get_password_hash, verify_password


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def create(db: Session, email: str, password: str) -> User:
    user = User(email=email, hashed_password=get_password_hash(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = get_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def update_user_role(db: Session, user_id: int, new_role: str) -> Optional[User]:
    """Update user role."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    
    user.role = new_role
    db.commit()
    db.refresh(user)
    return user


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID."""
    return db.query(User).filter(User.id == user_id).first()


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """Get all users (admin only)."""
    return db.query(User).offset(skip).limit(limit).all()


