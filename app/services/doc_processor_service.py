
## `app/services/doc_processor_service.py`

import os
import mimetypes
from typing import Dict, Any
from pptx import Presentation
from google.cloud import documentai_v1 as documentai

from app.core.config import settings

# Config pulled from settings (set these in your env / config)
PROJECT_ID = getattr(settings, "DOCAI_PROJECT_ID", None)
LOCATION = getattr(settings, "DOCAI_LOCATION", "us")
PROCESSOR_ID = getattr(settings, "DOCAI_PROCESSOR_ID", None)


def _docai_client() -> documentai.DocumentProcessorServiceClient:
    return documentai.DocumentProcessorServiceClient()


async def process_file_to_structured(file_path: str) -> Dict[str, Any]:
    """
    Detect file type and return normalized structured output:
    {
      "text": str,
      "tables": list,
      "slides": list,
      "entities": list,
      "metadata": dict
    }
    """
    mime_type, _ = mimetypes.guess_type(file_path)

    if mime_type == "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        return _extract_pptx(file_path)

    # Fallback to Document AI for PDFs and other docs
    return _extract_docai(file_path)


def _extract_pptx(file_path: str) -> Dict[str, Any]:
    prs = Presentation(file_path)
    slides_data = []
    all_texts = []

    for i, slide in enumerate(prs.slides, start=1):
        slide_texts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text and shape.text.strip():
                text = shape.text.strip()
                slide_texts.append(text)
                all_texts.append(text)
        slides_data.append({"slide": i, "texts": slide_texts})

    return {
        "text": "\n".join(all_texts),
        "tables": [],
        "slides": slides_data,
        "entities": [],
        "metadata": {"slides": len(slides_data)}
    }


def _extract_docai(file_path: str) -> Dict[str, Any]:
    if not PROJECT_ID or not PROCESSOR_ID:
        raise RuntimeError("DocAI configuration (PROJECT_ID / PROCESSOR_ID) is missing")

    client = _docai_client()
    name = client.processor_path(PROJECT_ID, LOCATION, PROCESSOR_ID)

    # Guess mime-type; default to application/pdf
    mime_type, _ = mimetypes.guess_type(file_path)
    mime_type = mime_type or "application/pdf"

    with open(file_path, "rb") as f:
        raw = f.read()

    raw_document = documentai.RawDocument(content=raw, mime_type=mime_type)

    request = documentai.ProcessRequest(name=name, raw_document=raw_document)
    result = client.process_document(request=request)
    document = result.document

    text = document.text or ""

    tables = []
    for page in document.pages:
        for table in page.tables:
            rows = []
            for row in table.body_rows:
                cells = []
                for cell in row.cells:
                    # Extract plain text for the cell
                    cell_text = ""
                    if cell.layout and cell.layout.text_anchor:
                        try:
                            for segment in cell.layout.text_anchor.text_segments:
                                start = int(segment.start_index) if segment.start_index else 0
                                end = int(segment.end_index) if segment.end_index else None
                                cell_text += document.text[start:end]
                        except Exception:
                            pass
                    cells.append(cell_text)
                rows.append(cells)
            tables.append(rows)

    entities = []
    try:
        for e in document.entities:
            entities.append({"type": e.type_, "mention_text": e.mention_text})
    except Exception:
        pass

    return {
        "text": text,
        "tables": tables,
        "slides": [],
        "entities": entities,
        "metadata": {"pages": len(document.pages) if document.pages else 0}
    }
