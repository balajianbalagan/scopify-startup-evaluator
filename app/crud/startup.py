import json
from operator import or_
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.startup import Startup, StartupEvaluation
from app.schemas.startup import StartupCreate, StartupEvaluationCreate, StartupEvaluationUpdate


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


def get_startups(
    db: Session, 
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None
) -> List[Startup]:
    query = db.query(Startup)
    
    if search:
        query = query.filter(
            or_(
                Startup.name.ilike(f"%{search}%"),
                Startup.industry.ilike(f"%{search}%"),
                Startup.description.ilike(f"%{search}%")
            )
        )
    
    return query.offset(skip).limit(limit).all()

def get_startup(db: Session, startup_id: int) -> Optional[Startup]:
    return db.query(Startup).filter(Startup.id == startup_id).first()

def get_evaluation_by_company(db: Session, company_name: str) -> Optional[StartupEvaluation]:
    """Get evaluation by company name."""
    return db.query(StartupEvaluation).filter(
        StartupEvaluation.company_name.ilike(f"%{company_name}%")
    ).first()

def create_startup(db: Session, startup_in: StartupCreate) -> Startup:
    """
    Create a new Startup record in the database.

    Args:
        db (Session): SQLAlchemy session.
        startup_in (StartupCreate): Pydantic schema with startup data.

    Returns:
        Startup: The newly created Startup ORM object.
    """
    # Convert list/dict fields to JSON strings for the DB columns expecting Text
    db_startup = Startup(
        name=startup_in.name,
        website=startup_in.website,
        status=startup_in.status,
        location=startup_in.location,
        description=startup_in.description,
        leading_investor=startup_in.leading_investor,
        industry=startup_in.industry,
        is_unicorn=startup_in.is_unicorn,
        founded_year=startup_in.founded_year,
        number_of_employees=startup_in.number_of_employees,
        sub_categories=startup_in.sub_categories and json.dumps(startup_in.sub_categories),
        founders=startup_in.founders and json.dumps(startup_in.founders),
        total_funding_raised=startup_in.total_funding_raised,
        funding_stage=startup_in.funding_stage,
        total_valuation=startup_in.total_valuation,
        additional_information=startup_in.additional_information,
        investors=startup_in.investors and json.dumps(startup_in.investors),
        funding_rounds=startup_in.funding_rounds and json.dumps(startup_in.funding_rounds),
        latest_news=startup_in.latest_news,
        social_media_links=startup_in.social_media_links and json.dumps(startup_in.social_media_links),
        tam=startup_in.tam,
        arr=startup_in.arr,
        product=startup_in.product,
        challenges=startup_in.challenges,
        differentiator=startup_in.differentiator,
        competitors=startup_in.competitors and json.dumps(startup_in.competitors),
    )
    db.add(db_startup)
    db.commit()
    db.refresh(db_startup)
    return db_startup
