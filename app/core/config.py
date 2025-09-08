from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import BaseModel
from typing import Optional
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)

    PROJECT_NAME: str = "ProtoType API"
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = "change-this-in-.env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # Database (defaults to local sqlite for quick start)
    DATABASE_URL: str = "sqlite:///./app.db"

    # Optional Postgres-specific env vars (used if DATABASE_URL not explicitly set)
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_SERVER: Optional[str] = None  # host or host:port
    POSTGRES_DB: Optional[str] = None

    # Google AI Studio
    GOOGLE_AI_API_KEY: Optional[str] = None

    def build_postgres_url(self) -> Optional[str]:
        if not (self.POSTGRES_USER and self.POSTGRES_PASSWORD and self.POSTGRES_SERVER and self.POSTGRES_DB):
            return None
        server = self.POSTGRES_SERVER
        # Allow specifying host without port; default to 5432
        if ":" not in server:
            server = f"{server}:5432"
        return f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{server}/{self.POSTGRES_DB}"


settings = Settings()

# If a full DATABASE_URL was not provided, attempt to construct from Postgres parts
if settings.DATABASE_URL.startswith("sqlite"):
    candidate = settings.build_postgres_url()
    if candidate:
        settings.DATABASE_URL = candidate


