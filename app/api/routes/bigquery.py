from typing import List, Dict, Any, Optional
import logging
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
import tempfile
import os
from app.services.bigquery_service import BigQueryService
from app.services.vision_service import VisionService
from app.schemas.startup import StartupCreate, StartupEvaluationCreate
from app.db.models.startup import StartupStatus
from app.core.config import settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bigquery", tags=["BigQuery"])

@router.get("/startups", response_model=List[Dict[str, Any]])
async def get_startups(
    name: Optional[str] = None,
    status: Optional[StartupStatus] = None,
    limit: int = Query(default=100, le=1000)
):
    """
    Get startups with optional filters
    """
    try:
        bq_service = BigQueryService()
        return await bq_service.fetch_startups(name=name, status=status, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/startups/{startup_id}", response_model=Dict[str, Any])
async def get_startup_by_id(startup_id: int):
    """
    Get a specific startup by ID
    """
    try:
        bq_service = BigQueryService()
        startup = await bq_service.fetch_startup_by_id(startup_id)
        if not startup:
            raise HTTPException(status_code=404, detail="Startup not found")
        return startup
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/startups/search", response_model=List[Dict[str, Any]])
async def search_startups(search_params: Dict[str, Any]):
    """
    Advanced search with multiple parameters
    """
    try:
        bq_service = BigQueryService()
        return await bq_service.search_startups(search_params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/startups", response_model=Dict[str, Any])
async def ingest_startup(startup: StartupCreate):
    """
    Ingest new startup data
    """
    try:
        bq_service = BigQueryService()
        return await bq_service.ingest_startup_data(startup)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-document", response_model=Dict[str, Any])
async def process_document(file: UploadFile = File(...)):
    """
    Process a document using Google Vision API.
    Supports:
    - PDF (via async GCS OCR)
    - JPEG, PNG, GIF, TIFF, BMP (local OCR)
    Returns:
    - Extracted text
    - Text blocks with confidence scores
    - Detected labels/objects
    - Document features
    """
    logger.info(f"Received file: {file.filename}")
    
    if not settings.GOOGLE_APPLICATION_CREDENTIALS:
        logger.error("GOOGLE_APPLICATION_CREDENTIALS setting not configured")
        raise HTTPException(status_code=500, detail="Google Cloud credentials not configured")

    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_APPLICATION_CREDENTIALS
    if not os.path.exists(settings.GOOGLE_APPLICATION_CREDENTIALS):
        logger.error(f"Credentials file not found: {settings.GOOGLE_APPLICATION_CREDENTIALS}")
        raise HTTPException(status_code=500, detail="Google Cloud credentials file not found")
        
    logger.info(f"Using credentials from: {settings.GOOGLE_APPLICATION_CREDENTIALS}")

    allowed_extensions = ('.pdf', '.jpg', '.jpeg', '.png', '.gif', '.tiff', '.bmp')
    if not file.filename.lower().endswith(allowed_extensions):
        logger.warning(f"Invalid file format: {file.filename}")
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file format. Supported formats: {', '.join(allowed_extensions)}"
        )

    temp_file = None
    temp_path = None
    gcs_url = None  # Initialize gcs_url
    
    try:
        # Create a temp file for upload
        logger.info("Creating temporary file...")
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1])
        temp_path = temp_file.name
        
        content = await file.read()
        temp_file.write(content)
        temp_file.flush()
        temp_file.close()

        logger.info(f"Temporary file created: {temp_path} ({len(content)} bytes)")

        vision_service = VisionService()

        # Always upload to GCS first to get the proper gcs_url
        from google.cloud import storage
        storage_client = storage.Client()
        bucket_name = settings.GCS_BUCKET_NAME
        bucket = storage_client.bucket(bucket_name)

        # Upload file to GCS using the original filename
        blob_name = f"uploads/{file.filename}"
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(temp_path)
        gcs_url = f"gs://{bucket_name}/{blob_name}"
        logger.info(f"Uploaded file to GCS: {gcs_url}")

        # If it's a PDF → process with asyncBatch
        if file.filename.lower().endswith(".pdf"):
            logger.info("Detected PDF. Using GCS for async OCR...")
            
            # Choose an output prefix
            gcs_destination_uri = f"gs://{bucket_name}/vision_output/{file.filename}/"
            
            logger.info(f"Processing PDF from {gcs_url}, results to {gcs_destination_uri}")
            result = await vision_service.process_pdf_gcs(gcs_url, gcs_destination_uri)

        else:
            # For images → process locally (but we already uploaded to GCS)
            logger.info("Detected image file. Using local Vision API OCR...")
            result = await vision_service.process_document(temp_path)

        # Process with Gemini and store in BigQuery asynchronously
        bq_service = BigQueryService()
        processed_result = await bq_service.process_and_store_document(
            vision_result=result,
            file_name=file.filename,
            gcs_url=gcs_url  # Pass the actual GCS URL
        )

        # If we got basic error response from processing
        if processed_result.get("error"):
            logger.warning(f"Document processed with limited success: {processed_result['error']}")
            # Still return the result - it will contain the raw vision data
        else:
            logger.info("Document processed successfully")

        # Return the processed result in any case
        return processed_result

    except Exception as e:
        logger.error(f"Error processing document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

    finally:
        if temp_file is not None and temp_path is not None:
            logger.info("Cleaning up temporary file...")
            try:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    logger.info("Temporary file deleted")
            except Exception as cleanup_error:
                logger.warning(f"Failed to delete temporary file: {cleanup_error}")


@router.get("/documents", response_model=List[Dict[str, Any]])
async def get_document_analysis(
    company_name: Optional[str] = Query(None, description="Filter by company name (prefix match)"),
    industry: Optional[str] = Query(None, description="Filter by industry (prefix match)"),
    founding_year_min: Optional[int] = Query(None, description="Minimum founding year"),
    founding_year_max: Optional[int] = Query(None, description="Maximum founding year"),
    company_stage: Optional[str] = Query(None, description="Filter by company stage (prefix match)"),
    limit: int = Query(default=100, le=1000, description="Max number of records to fetch")
):
    """
    Get document analysis records from BigQuery with optional filters.
    Supports prefix search for company_name, industry, and company_stage.
    """
    try:
        bq_service = BigQueryService()
        return await bq_service.fetch_document_analysis(
            company_name=company_name,
            industry=industry,
            founding_year_min=founding_year_min,
            founding_year_max=founding_year_max,
            company_stage=company_stage,
            limit=limit
        )
    except ValueError as ve:
        # Specifically handle validation errors like year range
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching document analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error fetching document analysis: {str(e)}")
