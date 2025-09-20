import asyncio
import logging
import os
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

from graph import Graph
from services.pdf_service import PDFService
from services.websocket_manager import WebSocketManager

# Load environment variables from .env file at startup
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)
console_handler = logging.StreamHandler()
logger.addHandler(console_handler)

app = FastAPI(title="Tavily Company Research API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

manager = WebSocketManager()
pdf_service = PDFService({"pdf_output_dir": "pdfs"})

job_status = defaultdict(lambda: {
    "status": "pending",
    "result": None,
    "error": None,
    "debug_info": [],
    "company": None,
    "report": None,
    "current_step": None,
    "progress_percentage": 0,
    "steps_completed": [],
    "total_steps": 8,
    "last_update": datetime.now().isoformat()
})

# MongoDB is no longer needed - returning results directly

class ResearchRequest(BaseModel):
    # Accept flexible startup data schema - can contain any structure
    startup_data: dict | None = None  # Full deck schema data

    # Optional: for backward compatibility
    company: str | None = None
    company_url: str | None = None
    industry: str | None = None
    hq_location: str | None = None

    # Allow any additional fields to be passed through
    class Config:
        extra = "allow"

class PDFGenerationRequest(BaseModel):
    report_content: str
    company_name: str | None = None

@app.options("/research")
async def preflight():
    response = JSONResponse(content=None, status_code=200)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

@app.post("/research")
async def research(data: ResearchRequest):
    try:
        logger.info(f"Received research request for {data.company}")
        job_id = str(uuid.uuid4())

        # Start research in background task
        asyncio.create_task(process_research(job_id, data))

        response = JSONResponse(content={
            "status": "accepted",
            "job_id": job_id,
            "message": "Research started. Connect to WebSocket for updates or check job status.",
            "websocket_url": f"/research/ws/{job_id}",
            "status_url": f"/research/{job_id}/status"
        })
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    except Exception as e:
        logger.error(f"Error initiating research: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

async def update_progress(job_id: str, step: str, progress: int, message: str):
    """Update job progress and status"""
    job_status[job_id].update({
        "current_step": step,
        "progress_percentage": progress,
        "last_update": datetime.now().isoformat()
    })
    if step not in job_status[job_id]["steps_completed"]:
        job_status[job_id]["steps_completed"].append(step)

    await manager.send_status_update(
        job_id=job_id,
        status="processing",
        message=message,
        result={
            "current_step": step,
            "progress": progress,
            "steps_completed": job_status[job_id]["steps_completed"],
            "total_steps": job_status[job_id]["total_steps"]
        }
    )

async def process_research(job_id: str, data: ResearchRequest):
    try:
        await asyncio.sleep(1)  # Allow WebSocket connection

        await update_progress(job_id, "initialization", 0, "Starting benchmark analysis")

        # Extract startup info from the deck schema
        startup_data = data.startup_data

        # If startup_data is not provided but we have schema fields directly, use them
        if not startup_data:
            # Check if the request contains schema-like data directly
            data_dict = data.model_dump()
            if 'named_entities' in data_dict:
                startup_data = {k: v for k, v in data_dict.items() if k not in ['company', 'company_url', 'industry', 'hq_location']}

        # Extract key company information from the schema
        company_name = None
        company_url = None
        industry = None
        hq_location = None

        # Try to extract from schema structure
        if startup_data:
            # Extract company name
            if "named_entities" in startup_data and "organizations" in startup_data["named_entities"]:
                company_info = startup_data["named_entities"]["organizations"].get("company", {})
                company_name = company_info.get("legal_name")
                if not company_name and company_info.get("brand_names"):
                    company_name = company_info.get("brand_names")[0]
                company_url = company_info.get("website_url")

            # Infer industry from business model or set a reasonable default
            if "business_model_classification" in startup_data:
                biz_model = startup_data["business_model_classification"]
                revenue_model = biz_model.get("revenue_model", "")
                if revenue_model == "saas":
                    industry = "Technology"
                elif revenue_model == "marketplace":
                    industry = "E-commerce"
                else:
                    industry = "Technology"  # Default

            # Extract headquarters location
            if "named_entities" in startup_data and "locations" in startup_data["named_entities"]:
                hq_info = startup_data["named_entities"]["locations"].get("headquarters", {})
                if hq_info:
                    city = hq_info.get("city", "")
                    country = hq_info.get("country", "")
                    hq_location = f"{city}, {country}" if city and country else city or country

        # Fallback to direct fields for backward compatibility
        company_name = company_name or data.company or "Target Company"
        company_url = company_url or data.company_url
        industry = industry or data.industry or "Technology"
        hq_location = hq_location or data.hq_location or "Global"

        logger.info(f"Extracted company info: {company_name}, {industry}, {hq_location}")

        await update_progress(job_id, "setup", 10, f"Initializing analysis for {company_name}")

        graph = Graph(
            company=company_name,
            url=company_url,
            industry=industry,
            hq_location=hq_location,
            startup_data=startup_data,  # Pass the full schema data
            websocket_manager=manager,
            job_id=job_id
        )

        state = {}
        step_mapping = {
            'collector': (15, "Collecting initial data"),
            'companies_products_analyst': (25, "Analyzing competitive landscape"),
            'consumer_brands_analyst': (35, "Analyzing consumer behavior"),
            'countries_regions_analyst': (45, "Analyzing regional markets"),
            'digital_trends_analyst': (55, "Analyzing technology trends"),
            'industries_markets_analyst': (65, "Analyzing market dynamics"),
            'politics_society_analyst': (75, "Analyzing political context"),
            'curator': (80, "Curating research data"),
            'enricher': (85, "Enriching analysis"),
            'briefing': (90, "Creating briefings"),
            'editor': (95, "Compiling final report")
        }

        try:
            async for s in graph.run(thread={}):
                if s is None:
                    logger.error("Graph returned None state!")
                    continue
                state.update(s)

                # Track progress based on completed steps
                for step_name, (progress, message) in step_mapping.items():
                    if step_name in s and step_name not in job_status[job_id]["steps_completed"]:
                        await update_progress(job_id, step_name, progress, message)
                        break

                logger.info(f"Updated state with keys: {list(s.keys()) if s else 'None'}")
        except Exception as e:
            logger.error(f"Error during graph execution: {str(e)}", exc_info=True)
            raise

        # Look for the compiled report in either location.
        logger.info(f"Final state keys: {list(state.keys())}")
        report_content = state.get('report') or (state.get('editor') or {}).get('report')
        if report_content:
            logger.info(f"Found report in final state (length: {len(report_content)})")
            await update_progress(job_id, "completed", 100, "Benchmark analysis completed successfully")

            job_status[job_id].update({
                "status": "completed",
                "report": report_content,
                "company": company_name,
                "progress_percentage": 100,
                "current_step": "completed",
                "last_update": datetime.now().isoformat()
            })
            await manager.send_status_update(
                job_id=job_id,
                status="completed",
                message="Benchmark analysis completed successfully",
                result={
                    "report": report_content,
                    "company": company_name,
                    "progress": 100,
                    "current_step": "completed"
                }
            )
        else:
            logger.error(f"Research completed without finding report. State keys: {list(state.keys())}")
            logger.error(f"Editor state: {state.get('editor', {})}")

            # Check if there was a specific error in the state
            error_message = "No report found in final state"
            if error := state.get('error'):
                error_message = f"Error: {error}"

            job_status[job_id].update({
                "status": "failed",
                "error": error_message,
                "current_step": "failed",
                "last_update": datetime.now().isoformat()
            })

            await manager.send_status_update(
                job_id=job_id,
                status="failed",
                message="Research completed but no report was generated",
                error=error_message
            )

    except Exception as e:
        logger.error(f"Research failed: {str(e)}")
        job_status[job_id].update({
            "status": "failed",
            "error": str(e),
            "last_update": datetime.now().isoformat()
        })
        await manager.send_status_update(
            job_id=job_id,
            status="failed",
            message=f"Research failed: {str(e)}",
            error=str(e)
        )
@app.get("/")
async def ping():
    return {"message": "Alive"}

@app.get("/research/pdf/{filename}")
async def get_pdf(filename: str):
    pdf_path = os.path.join("pdfs", filename)
    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(pdf_path, media_type='application/pdf', filename=filename)

@app.websocket("/research/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    try:
        await websocket.accept()
        await manager.connect(websocket, job_id)

        if job_id in job_status:
            status = job_status[job_id]
            await manager.send_status_update(
                job_id,
                status=status["status"],
                message="Connected to status stream",
                error=status["error"],
                result=status["result"]
            )

        while True:
            try:
                await websocket.receive_text()
            except WebSocketDisconnect:
                manager.disconnect(websocket, job_id)
                break

    except Exception as e:
        logger.error(f"WebSocket error for job {job_id}: {str(e)}", exc_info=True)
        manager.disconnect(websocket, job_id)

@app.get("/research/{job_id}/status")
async def get_research_status(job_id: str):
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Research job not found")
    return job_status[job_id]

@app.get("/research/{job_id}/progress")
async def get_research_progress(job_id: str):
    """Get detailed progress information for polling"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Research job not found")

    status = job_status[job_id]
    progress_info = {
        "job_id": job_id,
        "status": status["status"],
        "current_step": status.get("current_step", "pending"),
        "progress_percentage": status.get("progress_percentage", 0),
        "steps_completed": status.get("steps_completed", []),
        "total_steps": status.get("total_steps", 8),
        "company": status.get("company"),
        "last_update": status["last_update"],
        "error": status.get("error"),
        "has_report": bool(status.get("report")),
        "estimated_time_remaining": None
    }

    # Calculate estimated time remaining based on progress
    if progress_info["progress_percentage"] > 0 and progress_info["status"] == "processing":
        # Rough estimate: assume total time is ~2-3 minutes for benchmark analysis
        estimated_total_seconds = 150  # 2.5 minutes
        elapsed_percentage = progress_info["progress_percentage"] / 100
        if elapsed_percentage > 0:
            remaining_percentage = 1 - elapsed_percentage
            estimated_remaining = int(estimated_total_seconds * remaining_percentage)
            progress_info["estimated_time_remaining"] = f"{estimated_remaining}s"

    return progress_info

@app.get("/research/{job_id}/steps")
async def get_research_steps(job_id: str):
    """Get detailed step-by-step progress for the benchmark analysis"""
    if job_id not in job_status:
        raise HTTPException(status_code=404, detail="Research job not found")

    steps_detail = {
        "job_id": job_id,
        "status": job_status[job_id]["status"],
        "steps": [
            {
                "name": "initialization",
                "display_name": "Initialization",
                "description": "Setting up benchmark analysis",
                "progress": 0,
                "status": "completed" if "initialization" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "setup",
                "display_name": "Setup",
                "description": "Extracting company information",
                "progress": 10,
                "status": "completed" if "setup" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "collector",
                "display_name": "Data Collection",
                "description": "Gathering initial research data",
                "progress": 15,
                "status": "completed" if "collector" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "companies_products_analyst",
                "display_name": "Competitive Analysis",
                "description": "Analyzing market leaders and direct competitors",
                "progress": 25,
                "status": "completed" if "companies_products_analyst" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "consumer_brands_analyst",
                "display_name": "Consumer Insights",
                "description": "Analyzing consumer behavior and brand sentiment",
                "progress": 35,
                "status": "completed" if "consumer_brands_analyst" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "countries_regions_analyst",
                "display_name": "Regional Analysis",
                "description": "Analyzing geographic markets and economics",
                "progress": 45,
                "status": "completed" if "countries_regions_analyst" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "digital_trends_analyst",
                "display_name": "Technology Trends",
                "description": "Analyzing digital transformation and tech adoption",
                "progress": 55,
                "status": "completed" if "digital_trends_analyst" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "industries_markets_analyst",
                "display_name": "Market Intelligence",
                "description": "Analyzing industry dynamics and market size",
                "progress": 65,
                "status": "completed" if "industries_markets_analyst" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "politics_society_analyst",
                "display_name": "Political Context",
                "description": "Analyzing political and social factors",
                "progress": 75,
                "status": "completed" if "politics_society_analyst" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "curator",
                "display_name": "Data Curation",
                "description": "Processing and organizing research data",
                "progress": 80,
                "status": "completed" if "curator" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "enricher",
                "display_name": "Data Enrichment",
                "description": "Enriching analysis with additional insights",
                "progress": 85,
                "status": "completed" if "enricher" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "briefing",
                "display_name": "Briefing Generation",
                "description": "Creating analytical briefings",
                "progress": 90,
                "status": "completed" if "briefing" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "editor",
                "display_name": "Report Compilation",
                "description": "Compiling final benchmark report",
                "progress": 95,
                "status": "completed" if "editor" in job_status[job_id].get("steps_completed", []) else "pending"
            },
            {
                "name": "completed",
                "display_name": "Completed",
                "description": "Benchmark analysis finished",
                "progress": 100,
                "status": "completed" if job_status[job_id]["status"] == "completed" else "pending"
            }
        ],
        "current_step": job_status[job_id].get("current_step", "pending"),
        "progress_percentage": job_status[job_id].get("progress_percentage", 0),
        "last_update": job_status[job_id]["last_update"]
    }

    return steps_detail

@app.get("/research/{job_id}/report")
async def get_research_report(job_id: str):
    if job_id in job_status:
        result = job_status[job_id]
        if report := result.get("report"):
            return {"report": report, "company": result.get("company"), "status": result.get("status")}
    raise HTTPException(status_code=404, detail="Report not found")

@app.post("/generate-pdf")
async def generate_pdf(data: PDFGenerationRequest):
    """Generate a PDF from markdown content and stream it to the client."""
    try:
        success, result = pdf_service.generate_pdf_stream(data.report_content, data.company_name)
        if success:
            pdf_buffer, filename = result
            return StreamingResponse(
                pdf_buffer,
                media_type='application/pdf',
                headers={
                    'Content-Disposition': f'attachment; filename="{filename}"'
                }
            )
        else:
            raise HTTPException(status_code=500, detail=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)