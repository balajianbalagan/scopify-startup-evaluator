from typing import Generator
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from google.cloud.sql.connector import Connector

from app.core.config import settings
from app.db.base import Base

# Initialize connector
connector = Connector()

def create_database_engine():
    """Create database engine with Cloud SQL Connector."""
    try:
        engine = create_engine(
            "postgresql+pg8000://",
            creator=lambda: connector.connect(
                settings.INSTANCE_CONNECTION_NAME,  # e.g. "project:region:instance"
                "pg8000",
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                db=settings.DB_NAME,
            ),
        )

        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine

    except SQLAlchemyError as e:
        print(f"❌ Database connection failed: {e}")
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
    """Initialize database schema in Cloud SQL (create tables if not exists)."""
    try:
        # Import models so that Base.metadata has all of them
        from app.db import models  # ensures models are registered

        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully in Cloud SQL")
    except SQLAlchemyError as e:
        print(f"❌ Failed to create database tables: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error initializing database: {e}")
        sys.exit(1)
