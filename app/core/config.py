from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

PROJECT_ROOT = Path(__file__).parent.parent.parent
ENV_FILE_PATH = PROJECT_ROOT / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict( env_file=str(ENV_FILE_PATH), env_file_encoding="utf-8", case_sensitive=False)

    SCOPIFY_PROJECT_NAME: str = "ProtoType API"
    ENVIRONMENT: str = "development"

    # Security
    SECRET_KEY: str = ".env"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # Database (defaults to local sqlite for quick start)
    SCOPIFY_DATABASE_URL: str = "postgresql://postgres:postgres@localhost/scopify"

    # Optional Postgres-specific env vars (used if DATABASE_URL not explicitly set)
    SCOPIFY_POSTGRES_USER: Optional[str] = None
    SCOPIFY_POSTGRES_PASSWORD: Optional[str] = None
    SCOPIFY_POSTGRES_SERVER: Optional[str] = None  # host or host:port
    SCOPIFY_POSTGRES_DB: Optional[str] = None

    # Google AI Studio
    SCOPIFY_GOOGLE_AI_API_KEY: Optional[str] = None
    
    # Default admin user (created on startup)
    DEFAULT_ADMIN_EMAIL: Optional[str] = None
    DEFAULT_ADMIN_PASSWORD: Optional[str] = None

    def build_postgres_url(self) -> Optional[str]:
        if not (self.SCOPIFY_POSTGRES_USER and self.SCOPIFY_POSTGRES_PASSWORD and self.SCOPIFY_POSTGRES_SERVER and self.SCOPIFY_POSTGRES_DB):
            return None
        server = self.POSTGRES_SERVER
        # Allow specifying host without port; default to 5432
        if ":" not in server:
            server = f"{server}:5432"
        return f"postgresql+psycopg2://{self.SCOPIFY_POSTGRES_USER}:{self.SCOPIFY_POSTGRES_PASSWORD}@{server}/{self.SCOPIFY_POSTGRES_DB}"


settings = Settings()
# If a full DATABASE_URL was not provided, attempt to construct from Postgres parts
if settings.SCOPIFY_DATABASE_URL.startswith("sqlite"):
    candidate = settings.build_postgres_url()
    if candidate:
        settings.SCOPIFY_DATABASE_URL = candidate


