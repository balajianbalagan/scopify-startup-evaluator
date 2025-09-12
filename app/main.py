from fastapi import FastAPI, Depends
import sys

from app.core.config import settings
from app.db.session import init_db
from app.api.routes.auth import router as auth_router
from app.api.routes.startup import router as startup_router
from app.api.routes.company import router as company_router
from app.api.routes.admin import router as admin_router
from app.api.deps import get_current_user


def create_app() -> FastAPI:
    print(f"🚀 Starting {settings.SCOPIFY_PROJECT_NAME} in {settings.ENVIRONMENT} mode")
    print(f"📊 Database URL: {settings.SCOPIFY_DATABASE_URL}")
    
    application = FastAPI(title=settings.SCOPIFY_PROJECT_NAME)

    # Routers
    application.include_router(auth_router)
    application.include_router(startup_router)
    application.include_router(company_router)
    application.include_router(admin_router)

    @application.get("/health")
    def health_check():
        return {"status": "ok"}

    @application.get("/auth/me")
    def read_me(user=Depends(get_current_user)):
        return {"email": user.email, "is_active": user.is_active, "is_superuser": user.is_superuser}

    return application


def startup():
    """Application startup with error handling."""
    try:
        print("🔧 Initializing database...")
        init_db()
        print("✅ Application startup completed successfully")
    except Exception as e:
        print(f"❌ Application startup failed: {e}")
        sys.exit(1)


app = create_app()

# Initialize database on startup
startup()


