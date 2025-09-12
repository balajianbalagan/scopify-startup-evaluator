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
from app.api.deps import get_current_user
from app import crud
from app.db.session import get_db
from sqlalchemy.orm import Session

def create_app() -> FastAPI:
    print(f"🚀 Starting {settings.SCOPIFY_PROJECT_NAME} in {settings.ENVIRONMENT} mode")
    print(f"📊 Database URL: {settings.SCOPIFY_DATABASE_URL}")
    
    application = FastAPI(title=settings.SCOPIFY_PROJECT_NAME)
    
    # Add CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Add your frontend URL
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    # Routers
    application.include_router(auth_router)
    application.include_router(startup_router)
    application.include_router(company_router)
    application.include_router(admin_router)

    return application

def startup():
    """Application startup with error handling."""
    try:
        print("🔧 Initializing database...")
        init_db()

        # ✅ Create default admin if configured
        if settings.DEFAULT_ADMIN_EMAIL and settings.DEFAULT_ADMIN_PASSWORD:
            db: Session = next(get_db())
            admin = crud.user.get_by_email(db, settings.DEFAULT_ADMIN_EMAIL)
            if not admin:
                # Create basic user
                admin = crud.user.create(
                    db,
                    email=settings.DEFAULT_ADMIN_EMAIL,
                    password=settings.DEFAULT_ADMIN_PASSWORD,
                )
                # Promote to admin
                admin.role = UserRole.ADMIN
                admin.is_superuser = True
                db.commit()
                db.refresh(admin)
                print(f"✅ Default admin created: {settings.DEFAULT_ADMIN_EMAIL}")
            else:
                print(f"ℹ️ Default admin already exists: {settings.DEFAULT_ADMIN_EMAIL}")

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
