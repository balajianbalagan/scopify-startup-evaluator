## `app/api/routes/pitchdeck.py`

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import tempfile
import os

from app.db.models.user import User
from app.api.deps import get_current_active_user
from app.services.doc_processor_service import process_file_to_structured
from app.services.pitchdeck_ai_service import pitchdeck_ai_service

router = APIRouter(prefix="/pitchdeck", tags=["pitchdeck"])


@router.post("/ingest")
async def ingest_pitchdeck(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)):
    """
    Full pipeline: process the uploaded document (DocAI / pptx) into normalized structured data,
    then run the pitchdeck analysis AI to return structured insights JSON to the client.
    """
    suffix = os.path.splitext(file.filename)[1]
    tmp_path = None

    if not (file.filename.endswith(".pdf") or file.filename.endswith(".pptx") or file.filename.endswith(".pptx")):
        raise HTTPException(status_code=400, detail="Only PDF and PPTX files are supported.")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        # Step 1: Normalize with Doc processor
        structured = await process_file_to_structured(tmp_path)

        # Step 2: Analyze with Gemini-based Pitchdeck AI
        summary = await pitchdeck_ai_service.summarize_structured_data(structured, file.filename)

        return {
            "filename": file.filename,
            "structured_data": structured,
            "analysis": summary,
        }

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
