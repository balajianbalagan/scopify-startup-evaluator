from sqlalchemy.orm import declarative_base

# Create the Base class
Base = declarative_base()

# Import all models here
from app.db.models.startup import Startup
from app.db.models.document_analysis import DocumentAnalysis

# This will ensure all models are registered
__all__ = ["Base", "Startup", "DocumentAnalysis"]
