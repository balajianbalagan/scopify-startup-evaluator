# app/crud/flag.py
from app.schemas.flag import CompanyFlag
from sqlalchemy.orm import Session
from app.db.models.company import CompanyInformation

def get_companies_with_flags(db: Session):
    # Get all companies and their flags
    companies = db.query(CompanyInformation).all()
    result = []
    for company in companies:
        flags = db.query(CompanyFlag).filter(CompanyFlag.company_id == company.id).all()
        result.append({
            "company": company,
            "flags": flags
        })
    return result