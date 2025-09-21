from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Body, Query
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
import json

from app.api.deps import get_current_active_user, get_db  # or require_partner_or_admin if you want stricter access
from app.services.agent_service import AgentService
import logging
import time

router = APIRouter(prefix="/agent", tags=["agent"])
logger = logging.getLogger("app.api.routes.agent")

def _parse_json_field(field_value: Optional[str], field_name: str) -> Optional[Dict[str, Any]]:
    if field_value is None or field_value == "":
        return None
    try:
        return json.loads(field_value)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_name} must be a valid JSON string"
        )


@router.post("/run-session", summary="Run agent session with a PDF")
async def run_session_with_pdf(
    user_id: str = Form(...),
    session_id: str = Form(...),
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    role: str = Form("user"),
    streaming: bool = Form(False),
    state_delta: Optional[str] = Form(None),              # JSON string
    session_bootstrap_payload: Optional[str] = Form(None),# JSON string
    current_user=Depends(get_current_active_user),
):
    # Validate file content type (optional but recommended)
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        logger.warning("Invalid content type: %s", file.content_type)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported"
        )

    start_ts = time.perf_counter()
    logger.info(
        "run-session request: user_id=%s session_id=%s filename=%s content_type=%s streaming=%s",
        user_id, session_id, file.filename, file.content_type, streaming,
    )

    try:
        file_bytes = await file.read()
        logger.debug("Uploaded file size: %d bytes", len(file_bytes))

        state_delta_obj = _parse_json_field(state_delta, "stateDelta")
        bootstrap_obj = _parse_json_field(session_bootstrap_payload, "sessionBootstrapPayload")
        logger.debug("Parsed state_delta keys: %s", list(state_delta_obj.keys()) if state_delta_obj else None)
        logger.debug("Parsed bootstrap keys: %s", list(bootstrap_obj.keys()) if bootstrap_obj else None)

        agent_service = AgentService()
        logger.debug("AgentService base_url=%s timeout=%s", agent_service.base_url, agent_service.timeout)

        result = await agent_service.run_session_with_pdf(
            user_id=user_id,
            session_id=session_id,
            file_bytes=file_bytes,
            filename=file.filename or "document.pdf",
            mime_type=file.content_type or "application/pdf",
            text=text,
            role=role,
            streaming=streaming,
            state_delta=state_delta_obj,
            session_bootstrap_payload=bootstrap_obj,
        )
        
        ## find empty fields and raise red flag
        # _raise_flags_from_result(result=result, company_id=int(user_id), db_session=agent_service.db_session)

        elapsed = time.perf_counter() - start_ts
        logger.info(
            "run-session success in %.2fs; result_type=%s keys=%s",
            elapsed, type(result).__name__, list(result.keys()) if isinstance(result, dict) else None
        )
        return result

    except HTTPException:
        # Already meaningful error; still log it with stack trace
        logger.exception("run-session HTTPException for user_id=%s session_id=%s", user_id, session_id)
        raise
    except Exception as e:
        elapsed = time.perf_counter() - start_ts
        logger.exception("run-session failed in %.2fs: %s", elapsed, str(e))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to run agent session: {str(e)}"
        )

@router.post("/benchmark/research", summary="Invoke benchmark research")
async def benchmark_research(
    payload: dict = Body(...),
    company_id: int = Query(..., description="CompanyInformation ID to update"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Invoke the /research endpoint on the benchmark agent and update CompanyInformation.
    """
    try:
        agent_service = AgentService()
        result = await agent_service.invoke_benchmark_research(payload, company_id, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Benchmark research invocation failed: {str(e)}"
        )

@router.get("/benchmark/research/{research_id}/progress", summary="Get benchmark research progress")
async def benchmark_research_progress(
    research_id: str,
    company_id: int = Query(..., description="CompanyInformation ID to update"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """
    Get progress for a benchmark research job and update CompanyInformation.
    """
    try:
        agent_service = AgentService()
        result = await agent_service.get_benchmark_research_progress(research_id, company_id, db)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Benchmark research progress failed: {str(e)}"
        )

@router.get("/benchmark/research/{research_id}/report", summary="Get benchmark research report")
async def benchmark_research_report(
    research_id: str,
    current_user=Depends(get_current_active_user),
):
    """
    Get report for a benchmark research job.
    """
    try:
        agent_service = AgentService()
        result = await agent_service.get_benchmark_research_report(research_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Benchmark research report failed: {str(e)}"
        )


@router.post("/dealnote/session", summary="Create/Invoke Dealnote session")
async def dealnote_create_session(
    user_id: str = Query(..., description="Dealnote userId"),
    session_id: str = Query(..., description="Dealnote sessionId"),
    current_user=Depends(get_current_active_user),
):
    """
    Calls the Dealnote agent session endpoint with an empty JSON payload.
    """
    try:
        agent_service = AgentService()
        result = await agent_service.invoke_dealnote_session(user_id, session_id, {})
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Dealnote session invocation failed: {str(e)}",
        )


@router.post("/dealnote/run", summary="Run Dealnote /run with payload")
async def dealnote_run(
    payload: Dict[str, Any] = Body(..., description="Raw payload for Dealnote /run"),
    current_user=Depends(get_current_active_user),
):
    """
    Calls the Dealnote agent /run endpoint with the provided JSON payload.
    """
    try:
        agent_service = AgentService()
        result = await agent_service.run_dealnote_app(payload)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Dealnote run failed: {str(e)}",
        )


@router.post("/dealnote/session-run", summary="Create Dealnote session then run")
async def dealnote_session_and_run(
    user_id: str = Query(..., description="Dealnote userId"),
    session_id: str = Query(..., description="Dealnote sessionId"),
    run_payload: Dict[str, Any] = Body(..., alias="runPayload", description="Payload for /run call"),
    current_user=Depends(get_current_active_user),
):
    """
    Convenience endpoint that first invokes the Dealnote session (with empty body) and then triggers /run.
    Expects a JSON body with key: { "runPayload": {...} }
    """
    try:
        agent_service = AgentService()
        result = await agent_service.create_dealnote_session_and_run(
            user_id=user_id,
            session_id=session_id,
            run_payload=run_payload,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Dealnote session-run failed: {str(e)}",
        )