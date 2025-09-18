import os
import logging
import mimetypes
from typing import Dict, Any
from google.cloud import vision, storage
import json
from app.core.config import settings
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VisionService:
    def _get_mime_type(self, file_path: str) -> str:
        """Detect the MIME type of a file"""
        mime_type, _ = mimetypes.guess_type(file_path)
        return mime_type or 'application/octet-stream'

    def _create_error_response(self, error_msg: str) -> Dict[str, Any]:
        """Create a standardized error response"""
        return {
            "text": "",
            "text_blocks": [],
            "labels": [],
            "features": {"languages": [], "page_count": 0},
            "error": error_msg
        }

    def __init__(self):
        logger.info("Initializing Vision API client...")
        try:
            if not settings.GOOGLE_APPLICATION_CREDENTIALS:
                raise ValueError("GOOGLE_APPLICATION_CREDENTIALS setting not configured")
                
            # Ensure the environment variable is set
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = settings.GOOGLE_APPLICATION_CREDENTIALS
            logger.info(f"Using credentials from: {settings.GOOGLE_APPLICATION_CREDENTIALS}")
            
            if not os.path.exists(settings.GOOGLE_APPLICATION_CREDENTIALS):
                raise FileNotFoundError(f"Credentials file not found: {settings.GOOGLE_APPLICATION_CREDENTIALS}")
                
            self.client = vision.ImageAnnotatorClient()
            logger.info("Vision API client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Vision API client: {str(e)}", exc_info=True)
            raise

    async def process_pdf_gcs(self, gcs_source_uri: str, gcs_destination_uri: str):
        """
        Process a PDF/TIFF stored in GCS using Vision API asyncBatchAnnotateFiles.
        Extracts text, text blocks, and features across all pages.
        """
        try:
            mime_type = "application/pdf"
            batch_size = 2

            feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)

            gcs_source = vision.GcsSource(uri=gcs_source_uri)
            input_config = vision.InputConfig(gcs_source=gcs_source, mime_type=mime_type)

            gcs_destination = vision.GcsDestination(uri=gcs_destination_uri)
            output_config = vision.OutputConfig(
                gcs_destination=gcs_destination, batch_size=batch_size
            )

            async_request = vision.AsyncAnnotateFileRequest(
                features=[feature],
                input_config=input_config,
                output_config=output_config,
            )

            operation = self.client.async_batch_annotate_files(requests=[async_request])
            logger.info("Waiting for Vision API async operation to finish...")
            operation.result(timeout=420)

            # Fetch output JSON(s) from GCS
            storage_client = storage.Client()
            match = re.match(r"gs://([^/]+)/(.+)", gcs_destination_uri)
            bucket_name, prefix = match.group(1), match.group(2)
            bucket = storage_client.bucket(bucket_name)

            blob_list = [
                blob for blob in bucket.list_blobs(prefix=prefix)
                if not blob.name.endswith("/")
            ]
            if not blob_list:
                return self._create_error_response("No output JSON found in GCS")

            logger.info(f"Found {len(blob_list)} output JSON files in {gcs_destination_uri}")

            full_text = ""
            text_blocks = []
            total_pages = 0

            # Iterate through all output JSON files
            for blob in blob_list:
                json_string = blob.download_as_bytes().decode("utf-8")
                response = json.loads(json_string)

                # Each response corresponds to 1 page
                for page_response in response.get("responses", []):
                    annotation = page_response.get("fullTextAnnotation", {})
                    if not annotation:
                        continue

                    full_text += annotation.get("text", "") + "\n"

                    # Extract blocks
                    for page in annotation.get("pages", []):
                        total_pages += 1
                        for block in page.get("blocks", []):
                            block_text = ""
                            for paragraph in block.get("paragraphs", []):
                                for word in paragraph.get("words", []):
                                    symbols = [s["text"] for s in word.get("symbols", [])]
                                    block_text += "".join(symbols) + " "

                            if block_text.strip():
                                text_blocks.append({
                                    "text": block_text.strip(),
                                    "confidence": block.get("confidence", 0.0),
                                    "bounding_box": [
                                        {"x": v.get("x", 0), "y": v.get("y", 0)}
                                        for v in block.get("boundingBox", {}).get("vertices", [])
                                    ]
                                })

            logger.info(f"Extracted {len(full_text)} characters across {total_pages} pages")

            return {
                "text": full_text.strip(),
                "text_blocks": text_blocks,
                "labels": [],  # not supported in async PDF mode
                "features": {"page_count": total_pages},
                "error": None,
            }

        except Exception as e:
            logger.error(f"Error processing PDF via GCS: {str(e)}", exc_info=True)
            return self._create_error_response(str(e))
