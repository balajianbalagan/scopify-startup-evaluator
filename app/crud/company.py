from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.company import CompanyInformation
from app.schemas.company import CompanyInformationCreate

def get_companies(
    db: Session, 
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None
) -> List[CompanyInformation]:
    query = db.query(CompanyInformation)
    
    if search:
        query = query.filter(
            CompanyInformation.company_name.ilike(f"%{search}%")
        )
    
    return query.offset(skip).limit(limit).all()

def create_company_search(
    db: Session, 
    company_info: CompanyInformationCreate, 
    requested_by_id: int
) -> CompanyInformation:
    """Create a new company information search record."""
    db_company_info = CompanyInformation(
        company_name=company_info.company_name,
        ai_generated_info=company_info.ai_generated_info,
        search_query=company_info.search_query,
        requested_by_id=requested_by_id,
        pitch_deck_url=company_info.pitch_deck_url,
        benchmark_status=company_info.benchmark_status,
        benchmark_info=company_info.benchmark_info,
        dealnote_info=company_info.dealnote_info,
        deal_notes_status=company_info.deal_notes_status,
    )
    db.add(db_company_info)
    db.commit()
    db.refresh(db_company_info)
    return db_company_info


def get_company_search(db: Session, search_id: int) -> Optional[CompanyInformation]:
    """Get a company search by ID."""
    return db.query(CompanyInformation).filter(CompanyInformation.id == search_id).first()


def get_company_searches_by_user(
    db: Session, 
    user_id: int, 
    skip: int = 0, 
    limit: int = 100
) -> List[CompanyInformation]:
    """Get all company searches by a specific user."""
    return (
        db.query(CompanyInformation)
        .filter(CompanyInformation.requested_by_id == user_id)
        .order_by(CompanyInformation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_all_company_searches(
    db: Session, 
    skip: int = 0, 
    limit: int = 100
) -> List[CompanyInformation]:
    """Get all company searches (admin only)."""
    return (
        db.query(CompanyInformation)
        .order_by(CompanyInformation.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_company_search_by_name(
    db: Session, 
    company_name: str, 
    user_id: Optional[int] = None
) -> Optional[CompanyInformation]:
    """Get the most recent company search by company name."""
    query = db.query(CompanyInformation).filter(
        CompanyInformation.company_name.ilike(f"%{company_name}%")
    )
    
    if user_id:
        query = query.filter(CompanyInformation.requested_by_id == user_id)
    
    return query.order_by(CompanyInformation.created_at.desc()).first()


def update_company_search(
    db: Session, 
    search_id: int, 
    ai_generated_info: dict
) -> Optional[CompanyInformation]:
    """Update company search with AI generated information."""
    db_company_info = get_company_search(db, search_id)
    if not db_company_info:
        return None
    
    db_company_info.ai_generated_info = ai_generated_info
    db.commit()
    db.refresh(db_company_info)
    return db_company_info


def delete_company_search(db: Session, search_id: int) -> bool:
    """Delete a company search record."""
    db_company_info = get_company_search(db, search_id)
    if not db_company_info:
        return False
    
    db.delete(db_company_info)
    db.commit()
    return True


def get_recent_searches_count(db: Session, user_id: int, hours: int = 24) -> int:
    """Get count of recent searches by user in the last N hours."""
    from datetime import datetime, timedelta
    
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(CompanyInformation)
        .filter(
            and_(
                CompanyInformation.requested_by_id == user_id,
                CompanyInformation.created_at >= cutoff_time
            )
        )
        .count()
    )
