from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_current_active_user, require_admin
from app.crud import user as user_crud
from app.db.session import get_db
from app.schemas.user import (
    UserRead, 
    UserRoleUpdate, 
    UserRoleUpdateResponse,
    AvailableRolesResponse
)
from app.db.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserRead])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all users (Admin only)."""
    return user_crud.get_all_users(db, skip=skip, limit=limit)


@router.get("/roles", response_model=AvailableRolesResponse)
def get_available_roles(
    current_user: User = Depends(get_current_active_user)
):
    """Get available roles and current user's role."""
    available_roles = [role.value for role in UserRole]
    return AvailableRolesResponse(
        available_roles=available_roles,
        current_user_role=current_user.role
    )


@router.put("/users/{user_id}/role", response_model=UserRoleUpdateResponse)
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user role (Admin only)."""
    # Check if user exists
    target_user = user_crud.get_user_by_id(db, user_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admin from changing their own role
    if target_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )
    
    # Validate the role
    try:
        new_role = UserRole(role_update.role)
    except ValueError:
        available_roles = [role.value for role in UserRole]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Available roles are: {', '.join(available_roles)}"
        )
    
    # Update the role
    updated_user = user_crud.update_user_role(db, user_id, new_role)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user role"
        )
    
    return UserRoleUpdateResponse(
        id=updated_user.id,
        email=updated_user.email,
        role=updated_user.role,
        message=f"User role updated to {updated_user.role.value}"
    )


@router.get("/users/{user_id}", response_model=UserRead)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get user by ID (Admin only)."""
    user = user_crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.get("/users/search/{email}", response_model=UserRead)
def search_user_by_email(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Search user by email (Admin only)."""
    user = user_crud.get_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

