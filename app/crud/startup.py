from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.startup import StartupEvaluation
from app.schemas.startup import StartupEvaluationCreate, StartupEvaluationUpdate


def create_evaluation(db: Session, evaluation: StartupEvaluationCreate, partner_id: int) -> StartupEvaluation:
    """Create a new startup evaluation."""
    db_evaluation = StartupEvaluation(
        company_name=evaluation.company_name,
        partner_notes=evaluation.partner_notes,
        partner_id=partner_id,
        evaluation_status="pending"
    )
    db.add(db_evaluation)
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation


def get_evaluation(db: Session, evaluation_id: int) -> Optional[StartupEvaluation]:
    """Get a startup evaluation by ID."""
    return db.query(StartupEvaluation).filter(StartupEvaluation.id == evaluation_id).first()


def get_evaluations_by_partner(db: Session, partner_id: int) -> List[StartupEvaluation]:
    """Get all evaluations by a specific partner."""
    return db.query(StartupEvaluation).filter(StartupEvaluation.partner_id == partner_id).all()


def get_all_evaluations(db: Session, skip: int = 0, limit: int = 100) -> List[StartupEvaluation]:
    """Get all startup evaluations (admin only)."""
    return db.query(StartupEvaluation).offset(skip).limit(limit).all()


def update_evaluation(db: Session, evaluation_id: int, evaluation_update: StartupEvaluationUpdate, reviewer_id: int) -> Optional[StartupEvaluation]:
    """Update a startup evaluation (admin only)."""
    db_evaluation = get_evaluation(db, evaluation_id)
    if not db_evaluation:
        return None
    
    update_data = evaluation_update.dict(exclude_unset=True)
    update_data["reviewed_by_id"] = reviewer_id
    
    for field, value in update_data.items():
        setattr(db_evaluation, field, value)
    
    db.commit()
    db.refresh(db_evaluation)
    return db_evaluation


def get_evaluation_by_company(db: Session, company_name: str) -> Optional[StartupEvaluation]:
    """Get evaluation by company name."""
    return db.query(StartupEvaluation).filter(
        StartupEvaluation.company_name.ilike(f"%{company_name}%")
    ).first()

