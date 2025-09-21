from app.api.constants.flag_constants import FRIENDLY_NAMES
from app.schemas.flag import CompanyWithFlags
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.params import Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.api.deps import get_current_active_user, require_partner_or_admin
from app.crud import company as company_crud
from app.db.session import get_db
from app.schemas.company import (
    CompanyInformationCreate,
    CompanySearchRequest,
    CompanySearchResponse,
    CompanySearchError,
    CompanyInformationRead
)
from app.db.models.user import User
from app.services.google_ai_service import google_ai_service

router = APIRouter(prefix="/company", tags=["company"])


def _raise_flags_from_result(company_id: int, result: dict, db_session):
    flags = []
    
    def humanize_key(path: str) -> str:
        """Convert dotted path into human-readable label."""
        if path in FRIENDLY_NAMES:
            return FRIENDLY_NAMES[path]
        # fallback: split on . and _ and prettify
        pretty = path.split(".")[-1].replace("_", " ")
        return pretty.capitalize()


    # --- Check for nulls (except risk_assessment) ---
    def check_nulls(data, parent_key=""):
        if isinstance(data, dict):
            for k, v in data.items():
                if k == "risk_assessment":
                    continue  # handled separately
                if v is None:
                    flags.append(
                        CompanyFlag(
                            company_id=company_id,
                            flag_type="data_missing",
                            risk_level="medium",
                            flag_description=f"Missing value for {humanize_key(parent_key + '.' + k if parent_key else k)}",
                        )
                    )

                else:
                    check_nulls(v, parent_key + "." + k if parent_key else k)
        elif isinstance(data, list):
            for i, item in enumerate(data):
                check_nulls(item, f"{parent_key}[{i}]")

    check_nulls(result)

    # --- Check risk_assessment section ---
    risks = result.get("risk_assessment", {}).get("business_risks", {})
    for risk_name, risk_data in risks.items():
        if risk_data.get("level"):  # if level is set, flag it
            flags.append(
                CompanyFlag(
                    company_id=company_id,
                    flag_type="risk",
                    risk_level=risk_data.get("level", "low"),
                    flag_description=f"Risk identified: {risk_name}",
                )
            )

    # --- Save flags to DB ---
    db_session.add_all(flags)
    db_session.commit()

    return flags    

@router.post("/", response_model=CompanyInformationRead, status_code=status.HTTP_201_CREATED)
def create_company_info(
    company_in: CompanyInformationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """
    Create a new CompanyInformation record manually.
    Partners and Admins only.
    """
    # Prevent duplicate entries for the same company
    existing = company_crud.get_company_search_by_name(
        db, company_in.company_name, current_user.id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Company info for '{company_in.company_name}' already exists"
        )

    try:
        created = company_crud.create_company_search(
            db,
            company_in,
            requested_by_id=current_user.id
        )
        _raise_flags_from_result(created.id, created.ai_generated_info or {}, db)
        return created
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create company info: {str(e)}"
        )

@router.post("/search", response_model=CompanySearchResponse, status_code=status.HTTP_201_CREATED)
async def search_company_information(
    search_request: CompanySearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """
    Search for company information using Google AI Studio.
    Requires partner or admin role.
    """
    try:
        # Check if Google AI service is properly configured
        if not google_ai_service.validate_api_key():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google AI service is not properly configured"
            )
        
        # Check for rate limiting (optional - you can adjust the limits)
        recent_searches = company_crud.get_recent_searches_count(db, current_user.id, hours=1)
        if recent_searches >= 10:  # Limit to 10 searches per hour per user
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Maximum 10 searches per hour allowed."
            )
        
        # Check if we already have recent information for this company
        existing_search = company_crud.get_company_search_by_name(
            db, search_request.company_name, current_user.id
        )
        
        # If we have a recent search (within last 24 hours), return cached result
        if existing_search and existing_search.ai_generated_info:
            from datetime import datetime, timedelta
            if existing_search.created_at > datetime.utcnow() - timedelta(hours=24):
                return CompanySearchResponse(
                    company_name=existing_search.company_name,
                    information=existing_search.ai_generated_info,
                    search_timestamp=existing_search.search_timestamp,
                    message=f"Returning cached information for {existing_search.company_name}",
                    search_id=existing_search.id
                )
        
        # Create initial search record
        from app.schemas.company import CompanyInformationCreate
        company_info_create = CompanyInformationCreate(
            company_name=search_request.company_name,
            search_query=search_request.search_query
        )
        
        db_search = company_crud.create_company_search(
            db, company_info_create, current_user.id
        )
        
        # Call Google AI service
        ai_response = await google_ai_service.search_company_information(
            search_request.company_name,
            search_request.search_query
        )
        
        # Update the search record with AI response
        updated_search = company_crud.update_company_search(
            db, db_search.id, ai_response["information"]
        )
        
        return CompanySearchResponse(
            company_name=updated_search.company_name,
            information=updated_search.ai_generated_info,
            search_timestamp=updated_search.search_timestamp,
            message=f"Successfully retrieved information for {updated_search.company_name}",
            search_id=updated_search.id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log the error and return a generic error response
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while searching for company information: {str(e)}"
        )

@router.put("/{company_id}", response_model=CompanyInformationRead)
def update_company_info(
    company_id: int,
    update_data: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """
    Update an existing CompanyInformation record.
    Partners and Admins only.
    """
    db_company = company_crud.get_company_search(db, company_id)
    if not db_company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company information not found"
        )

    # Only allow update if user is admin or owner
    if current_user.role.value != "admin" and db_company.requested_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only update your own company information."
        )

    updated_company = company_crud.update_company_search(db, company_id, update_data)
    if not updated_company:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update company information"
        )
    return updated_company

@router.get("/searches/my", response_model=List[CompanyInformationRead])
def get_my_company_searches(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get current user's company search history."""
    return company_crud.get_company_searches_by_user(db, current_user.id, skip, limit)


@router.get("/searches", response_model=List[CompanyInformationRead])
def get_all_company_searches(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_partner_or_admin)
):
    """Get all company searches (admin and partners only)."""
    return company_crud.get_all_company_searches(db, skip, limit)


@router.get("/searches/{search_id}", response_model=CompanyInformationRead)
def get_company_search(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific company search by ID."""
    db_search = company_crud.get_company_search(db, search_id)
    if not db_search:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company search not found"
        )
    
    # Users can only see their own searches unless they're admin
    if current_user.role.value != "admin" and db_search.requested_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view your own searches."
        )
    
    return db_search


@router.get("/all", response_model=List[CompanyInformationRead])
def get_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all company information with optional search."""
    return company_crud.get_companies(db, skip=skip, limit=limit, search=search)

@router.delete("/searches/{search_id}")
def delete_company_search(
    search_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a company search record."""
    db_search = company_crud.get_company_search(db, search_id)
    if not db_search:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company search not found"
        )
    
    # Users can only delete their own searches unless they're admin
    if current_user.role.value != "admin" and db_search.requested_by_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only delete your own searches."
        )
    
    success = company_crud.delete_company_search(db, search_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete company search"
        )
    
    return {"message": "Company search deleted successfully"}


@router.get("/search/{company_name}", response_model=CompanySearchResponse)
def search_existing_company(
    company_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search for existing company information in our database."""
    db_search = company_crud.get_company_search_by_name(db, company_name, current_user.id)
    
    if not db_search or not db_search.ai_generated_info:
        return CompanySearchResponse(
            company_name=company_name,
            information={},
            search_timestamp=None,
            message=f"No information found for {company_name}",
            search_id=0
        )
    
    return CompanySearchResponse(
        company_name=db_search.company_name,
        information=db_search.ai_generated_info,
        search_timestamp=db_search.search_timestamp,
        message=f"Found existing information for {db_search.company_name}",
        search_id=db_search.id
    )
