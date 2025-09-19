import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_FILE_PATH = PROJECT_ROOT / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False
    )

    SCOPIFY_PROJECT_NAME: str = "ProtoType API"
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = ".env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    ALGORITHM: str = "HS256"

    # Cloud SQL (Postgres via Cloud SQL Connector)
    INSTANCE_CONNECTION_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    SQL_DRIVER: str = "pg8000"  # use pg8000 for Postgres

    def cloudsql_params(self) -> dict:
        """Return connection parameters for Cloud SQL Connector."""
        return {
            "instance_connection_string": self.INSTANCE_CONNECTION_NAME,
            "driver": self.SQL_DRIVER,
            "user": self.DB_USER,
            "password": self.DB_PASSWORD,
            "db": self.DB_NAME,
        }

    # Google AI Studio
    SCOPIFY_GOOGLE_AI_API_KEY: Optional[str] = None
    
    # Google Cloud Configuration
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GCS_BUCKET_NAME: Optional[str] = None
    
    # Google Document AI
    DOCAI_PROJECT_ID: Optional[str] = None
    DOCAI_LOCATION: str = "us"
    DOCAI_PROCESSOR_ID: Optional[str] = None
    
    # Default admin user (created on startup)
    DEFAULT_ADMIN_EMAIL: Optional[str] = None
    DEFAULT_ADMIN_PASSWORD: Optional[str] = None

settings = Settings()

# Debug: Print all settings
print("Loaded settings:")
print(f"GOOGLE_APPLICATION_CREDENTIALS: {settings.GOOGLE_APPLICATION_CREDENTIALS}")
print(f"ENV file path: {ENV_FILE_PATH}")
print(f"ENV file exists: {os.path.exists(ENV_FILE_PATH)}")

