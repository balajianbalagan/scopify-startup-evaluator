from app.db.models.company import CompanyInformation
from sqlalchemy.orm import Session
from app.db.models.flag import CompanyFlag


def get_companies_with_flags(db: Session):
    # Query only the columns you need
    companies = db.query(
        CompanyInformation.id,
        CompanyInformation.company_name,
        CompanyInformation.pitch_deck_url  # <-- match your model exactly
    ).all()

    result = []
    for company in companies:
        flags = db.query(CompanyFlag).filter(CompanyFlag.company_id == company.id).all()
        result.append({
            "company": {
                "id": company.id,
                "company_name": company.company_name,
                "pitchdeck_url": company.pitch_deck_url
            },
            "flags": flags
        })
    return result

def get_flags_by_company(db: Session, company_id: int):
    return db.query(CompanyFlag).filter(CompanyFlag.company_id == company_id).all()


def get_flag(db: Session, flag_id: int):
    return db.query(CompanyFlag).filter(CompanyFlag.id == flag_id).first()


def create_flag(db: Session, flag_in, created_by: int):
    db_flag = CompanyFlag(
        company_id=flag_in.company_id,
        flag_type=flag_in.flag_type,
        risk_level=flag_in.risk_level,
        flag_description=flag_in.flag_description,
        status=flag_in.status,
        created_by=created_by,
    )
    db.add(db_flag)
    db.commit()
    db.refresh(db_flag)
    return db_flag


def update_flag(db: Session, flag_id: int, flag_in):
    db_flag = get_flag(db, flag_id)
    if not db_flag:
        return None
    for field, value in flag_in.dict(exclude_unset=True).items():
        setattr(db_flag, field, value)
    db.commit()
    db.refresh(db_flag)
    return db_flag


def delete_flag(db: Session, flag_id: int):
    db_flag = get_flag(db, flag_id)
    if not db_flag:
        return False
    db.delete(db_flag)
    db.commit()
    return True
