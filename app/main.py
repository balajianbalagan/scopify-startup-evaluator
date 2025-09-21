from datetime import datetime
import json
import os
from fastapi import FastAPI, Depends
import sys
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.models.user import UserRole
from app.db.session import init_db
from app.api.routes.auth import router as auth_router
from app.api.routes.startup import router as startup_router
from app.api.routes.company import router as company_router
from app.api.routes.admin import router as admin_router
from app.api.routes.bigquery import router as bigquery_router
from app.api.routes.agent import router as agent_router
from app.api.deps import get_current_user
from app import crud, schemas
from app.db.session import get_db
from sqlalchemy.orm import Session
from app.api.routes.flag import router as flag_router
from app.schemas.startup import StartupCreate
from app.schemas.company import CompanyInformationCreate


def seed_mock_data(db: Session, file_path: str):
    """
    Seed the database with mock startups and company information
    from the given JSON file if the tables are empty.
    """
    with open(file_path) as f:
        data = json.load(f)

    # Seed Startups
    if not crud.startup.get_startups(db, skip=0, limit=1):
        for s in data.get("startups", []):
            dto = StartupCreate(
                name=s["name"],
                website=s.get("website"),
                status=s.get("status"),
                location=s.get("location"),
                description=s.get("description"),
                leading_investor=s.get("leading_investor"),
                industry=s.get("industry"),
                is_unicorn=s.get("is_unicorn", False),
                founded_year=s.get("founded_year"),
                number_of_employees=s.get("number_of_employees"),
                sub_categories=s.get("sub_categories"),  # list[str]
                founders=s.get("founders"),              # list[str]
                total_funding_raised=s.get("total_funding_raised"),
                funding_stage=s.get("funding_stage"),
                total_valuation=s.get("total_valuation"),
                additional_information=s.get("additional_information"),
                investors=s.get("investors"),            # list[str]
                funding_rounds=s.get("funding_rounds"),  # list[str]
                latest_news=s.get("latest_news"),
                social_media_links=s.get("social_media_links"),  # dict[str,str]
                tam=s.get("tam"),
                arr=s.get("arr"),
                product=s.get("product"),
                challenges=s.get("challenges"),
                differentiator=s.get("differentiator"),
                competitors=s.get("competitors"),        # list[str]
            )
            crud.startup.create_startup(db, dto)

    # Seed CompanyInformation
    if not crud.company.get_companies(db, skip=0, limit=1):
        for c in data.get("company_information", []):
            ts = datetime.fromisoformat(c["search_timestamp"].replace("Z", "+00:00"))
            dto = CompanyInformationCreate(
                company_name=c["company_name"],
                ai_generated_info=c.get("ai_generated_info"),
                search_query=c.get("search_query")
            )
            crud.company.create_company_search(
                db, dto, requested_by_id=c["requested_by_id"]
            )

def create_app() -> FastAPI:
    print(f"🚀 Starting {settings.SCOPIFY_PROJECT_NAME}")
    application = FastAPI(title=settings.SCOPIFY_PROJECT_NAME)
    # Allow CORS only for the deployed frontend
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["https://scopify-frontend-634194827064.us-central1.run.app"],
        allow_credentials=True,
        allow_methods=["*"] ,
        allow_headers=["*"] ,
    )
    
    # CORS middleware removed
    # Routers
    application.include_router(auth_router)
    application.include_router(startup_router)
    application.include_router(company_router)
    application.include_router(admin_router)
    application.include_router(bigquery_router)
    application.include_router(agent_router)
    application.include_router(flag_router)

    return application


def startup():
    """Application startup with error handling and mock-data seeding."""
    try:
        print("🔧 Initializing database...")
        init_db()

        # ✅ Create default admin if configured
        if settings.DEFAULT_ADMIN_EMAIL and settings.DEFAULT_ADMIN_PASSWORD:
            db: Session = next(get_db())
            admin = crud.user.get_by_email(db, settings.DEFAULT_ADMIN_EMAIL)
            if not admin:
                admin = crud.user.create(
                    db,
                    email=settings.DEFAULT_ADMIN_EMAIL,
                    password=settings.DEFAULT_ADMIN_PASSWORD,
                )
                admin.role = UserRole.ADMIN
                admin.is_superuser = True
                db.commit()
                db.refresh(admin)
                print(f"✅ Default admin created: {settings.DEFAULT_ADMIN_EMAIL}")
            else:
                print(f"ℹ️ Default admin already exists: {settings.DEFAULT_ADMIN_EMAIL}")

        # ✅ Seed mock data if not present
        mock_file = os.path.join(os.path.dirname(__file__), "..", "mock_data.json")
        with open(mock_file) as f:
            data = json.load(f)

        db: Session = next(get_db())

        # Seed startups
        mock_path = os.path.join(os.path.dirname(__file__), "..", "mock_data.json")
        seed_mock_data(db, mock_path)
        print("✅ Application startup completed successfully")
    except Exception as e:
        print(f"❌ Application startup failed: {e}")
        sys.exit(1)
app = create_app()

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/auth/me")
def read_me(user=Depends(get_current_user)):
    return {"email": user.email, "is_active": user.is_active, "is_superuser": user.is_superuser}

# Initialize database on startup
startup()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        port=8080
    )