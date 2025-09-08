from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_current_active_user, require_admin, require_partner_or_admin
from app.crud import startup as startup_crud
from app.db.session import get_db
from app.schemas.startup import (
    StartupEvaluationCreate, 
    StartupEvaluationRead, 
    StartupEvaluationUpdate,
    StartupEvaluationResponse
)
from app.db.models.user import User, UserRole

router = APIRouter(prefix="/startup", tags=["startup"])


@router.post("/evaluate", response_model=StartupEvaluationResponse, status_code=status.HTTP_201_CREATED)
def evaluate_startup(
    evaluation: StartupEvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """Submit a startup evaluation request (Partners only)."""
    if current_user.role != UserRole.PARTNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only partners can submit evaluations"
        )
    
    # Check if evaluation already exists for this company
    existing = startup_crud.get_evaluation_by_company(db, evaluation.company_name)
    if existing:
        return StartupEvaluationResponse(
            company_name=existing.company_name,
            evaluation_status=existing.evaluation_status,
            message=f"Evaluation already exists for {existing.company_name}",
            score=existing.evaluation_score,
            notes=existing.evaluation_notes
        )
    
    # Create new evaluation
    db_evaluation = startup_crud.create_evaluation(db, evaluation, current_user.id)
    
    return StartupEvaluationResponse(
        company_name=db_evaluation.company_name,
        evaluation_status=db_evaluation.evaluation_status,
        message=f"Evaluation submitted for {db_evaluation.company_name}. Status: {db_evaluation.evaluation_status}",
        score=db_evaluation.evaluation_score,
        notes=db_evaluation.evaluation_notes
    )


@router.get("/evaluations/my", response_model=List[StartupEvaluationRead])
def get_my_evaluations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """Get current user's evaluations."""
    if current_user.role == UserRole.PARTNER:
        return startup_crud.get_evaluations_by_partner(db, current_user.id)
    else:
        # Admin can see all evaluations
        return startup_crud.get_all_evaluations(db)


@router.get("/evaluations", response_model=List[StartupEvaluationRead])
def get_all_evaluations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all evaluations (Admin only)."""
    return startup_crud.get_all_evaluations(db, skip=skip, limit=limit)


@router.put("/evaluations/{evaluation_id}", response_model=StartupEvaluationRead)
def update_evaluation(
    evaluation_id: int,
    evaluation_update: StartupEvaluationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update an evaluation (Admin only)."""
    db_evaluation = startup_crud.update_evaluation(
        db, evaluation_id, evaluation_update, current_user.id
    )
    if not db_evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )
    return db_evaluation


@router.get("/evaluations/{evaluation_id}", response_model=StartupEvaluationRead)
def get_evaluation(
    evaluation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific evaluation."""
    db_evaluation = startup_crud.get_evaluation(db, evaluation_id)
    if not db_evaluation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation not found"
        )
    
    # Partners can only see their own evaluations
    if current_user.role == UserRole.PARTNER and db_evaluation.partner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return db_evaluation


@router.get("/search/{company_name}", response_model=StartupEvaluationResponse)
def search_company(
    company_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """Search for a company evaluation."""
    db_evaluation = startup_crud.get_evaluation_by_company(db, company_name)
    
    if not db_evaluation:
        return StartupEvaluationResponse(
            company_name=company_name,
            evaluation_status="not_found",
            message=f"No evaluation found for {company_name}",
            score=None,
            notes=None
        )
    
    # Partners can only see their own evaluations
    if current_user.role == UserRole.PARTNER and db_evaluation.partner_id != current_user.id:
        return StartupEvaluationResponse(
            company_name=company_name,
            evaluation_status="restricted",
            message="Evaluation exists but access denied",
            score=None,
            notes=None
        )
    
    return StartupEvaluationResponse(
        company_name=db_evaluation.company_name,
        evaluation_status=db_evaluation.evaluation_status,
        message=f"Evaluation found for {db_evaluation.company_name}",
        score=db_evaluation.evaluation_score,
        notes=db_evaluation.evaluation_notes
    )
