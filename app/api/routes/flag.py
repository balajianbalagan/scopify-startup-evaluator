from app.db.models.flag import FlagCreate, FlagRead, FlagUpdate
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_current_active_user, require_partner_or_admin
from app.db.session import get_db
from app.crud import flag as flag_crud
from app.db.models.user import User

router = APIRouter(prefix="/flags", tags=["flags"])

@router.get("/grouped", response_model=list)
def get_companies_and_flags(db: Session = Depends(get_db)):
    """
    Get all companies and their flags, grouped by company.
    """
    data = get_companies_with_flags(db)
    # Format for response: list of dicts with company and flags
    response = []
    for item in data:
        response.append({
            "company": CompanyInformationRead.model_validate(item["company"]),
            "flags": [FlagRead.model_validate(f) for f in item["flags"]]
        })
    return response

@router.get("/company/{company_id}", response_model=List[FlagRead])
def get_flags_by_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all flags associated with a company.
    Any authenticated user can access.
    """
    flags = flag_crud.get_flags_by_company(db, company_id)
    return flags


@router.get("/{flag_id}", response_model=FlagRead)
def get_flag(
    flag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific flag by ID.
    """
    flag = flag_crud.get_flag(db, flag_id)
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flag not found"
        )
    return flag


@router.post("/", response_model=FlagRead, status_code=status.HTTP_201_CREATED)
def create_flag(
    flag_in: FlagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """
    Create a new flag for a company.
    Partner or admin only.
    """
    try:
        created = flag_crud.create_flag(db, flag_in, created_by=current_user.id)
        return created
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create flag: {str(e)}"
        )


@router.put("/{flag_id}", response_model=FlagRead)
def update_flag(
    flag_id: int,
    flag_in: FlagUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """
    Update an existing flag.
    Partner or admin only.
    """
    flag = flag_crud.get_flag(db, flag_id)
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flag not found"
        )

    updated = flag_crud.update_flag(db, flag_id, flag_in)
    return updated


@router.delete("/{flag_id}")
def delete_flag(
    flag_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """
    Delete a flag.
    Partner or admin only.
    """
    flag = flag_crud.get_flag(db, flag_id)
    if not flag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flag not found"
        )

    success = flag_crud.delete_flag(db, flag_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete flag"
        )

    return {"message": "Flag deleted successfully"}
