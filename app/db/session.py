from typing import Generator
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.base import Base


def create_database_engine():
    """Create database engine with proper error handling."""
    try:
        engine = create_engine(
            settings.SCOPIFY_DATABASE_URL,
            connect_args={"check_same_thread": False} if settings.SCOPIFY_DATABASE_URL.startswith("sqlite") else {},
        )
        # Test the connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine
    except SQLAlchemyError as e:
        print(f"❌ Database connection failed: {e}")
        print(f"Database URL: {settings.SCOPIFY_DATABASE_URL}")
        print("Please check your database configuration and ensure the database is running.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error connecting to database: {e}")
        sys.exit(1)


engine = create_database_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initialize database with error handling."""
    try:
        # Import models here so that metadata is populated before create_all
        from app.db.models import user  # noqa: F401

        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
    except SQLAlchemyError as e:
        print(f"❌ Failed to create database tables: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error initializing database: {e}")
        sys.exit(1)


