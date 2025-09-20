import os
from typing import List, Optional, Dict, Any
from google.cloud import bigquery
from app.schemas.startup import StartupCreate, StartupEvaluationCreate
from app.db.models.startup import StartupStatus
import asyncio
import json
import re
from datetime import datetime
import logging
from google.cloud import aiplatform
import vertexai
from vertexai.generative_models import GenerativeModel
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)


class BigQueryService:
    def __init__(self):
        self.client = bigquery.Client()
        self.dataset_name = "scopify"
        self.table_name = "startups"
        self.doc_analysis_table = "document_analysis"
        
        # Initialize Vertex AI with explicit credentials and settings
        aiplatform.init(
            project=settings.DOCAI_PROJECT_ID,
            location="us-central1",  # Using a region where all models are available
            staging_bucket=None
        )
        
        # Ensure document analysis table exists
        self._ensure_doc_analysis_table_exists()
    
    def _construct_gcs_url(self, file_name: str) -> str:
        """Construct GCS URL based on the standard file storage pattern"""
        try:
            # Get bucket name from settings
            bucket_name = getattr(settings, 'GCS_BUCKET_NAME', None)
            if not bucket_name:
                logger.warning("GCS_BUCKET_NAME not found in settings")
                # Try alternative setting names that might be used
                bucket_name = getattr(settings, 'BUCKET_NAME', None) or \
                            getattr(settings, 'GOOGLE_CLOUD_BUCKET', None) or \
                            getattr(settings, 'STORAGE_BUCKET_NAME', None)
                
                if not bucket_name:
                    logger.error("No GCS bucket name found in settings. Using fallback.")
                    bucket_name = "scopify-documents"  # Fallback bucket name
            
            # Construct GCS URL based on standard upload pattern
            # This matches the pattern used in the router: f"uploads/{file.filename}"
            gcs_url = f"gs://{bucket_name}/uploads/{file_name}"
            logger.info(f"Constructed GCS URL: {gcs_url}")
            return gcs_url
            
        except Exception as e:
            logger.error(f"Error constructing GCS URL for {file_name}: {str(e)}")
            return f"gs://scopify-documents/uploads/{file_name}"
        
    async def process_and_store_document(self, vision_result: Dict[str, Any], file_name: str, gcs_url: str = None) -> Dict[str, Any]:
        """Process document with AI models and store in BigQuery"""
        
        # If gcs_url is not provided, construct it based on the standard storage pattern
        if not gcs_url:
            gcs_url = self._construct_gcs_url(file_name)
            logger.info(f"Auto-constructed GCS URL: {gcs_url}")
        else:
            logger.info(f"Using provided GCS URL: {gcs_url}")
        
        try:
            # Initialize Vertex AI for this request
            try:
                vertexai.init(
                    project=settings.DOCAI_PROJECT_ID,
                    location="us-central1"
                )
                
                # Initialize Gemini Pro model
                model = GenerativeModel("gemini-2.0-flash-exp")  # Using more stable model
                
                # Create clear, structured prompt with better formatting
                text_content = vision_result.get('text', '').strip()
                
                # Check if we have valid text content
                if not text_content or len(text_content) < 10:
                    logger.warning(f"Insufficient text content for analysis: {file_name}")
                    return {
                        "error": "Insufficient text content for analysis",
                        "company_name": "Unknown",
                        "pitch_deck_url": gcs_url,  # Include GCS URL even in error case
                        "raw_vision_data": vision_result
                    }
                
                prompt = f"""You are a business analyst. Extract structured information from the following business document text and return it as a valid JSON object.

Document text:
{text_content}

Instructions:
1. Extract business information and format as JSON
2. Use null for any missing information
3. Return ONLY valid JSON, no explanations or markdown formatting
4. Ensure all string values are properly quoted
5. If you cannot find specific information, use null or "Unknown"

Required JSON structure:
{{
    "company_name": "Company name or Unknown",
    "industry": "Industry sector or Unknown", 
    "founding_year": 2023,
    "company_stage": "startup/early/growth/mature",
    "key_products": ["product1", "product2"],
    "target_market": "Target customer description",
    "competitive_advantage": "Main competitive advantages",
    "revenue_model": "Revenue generation method",
    "funding_status": "Current funding situation",
    "team_size": 10
}}

JSON response:"""

                # Try to get response with better error handling
                max_retries = 3
                retry_count = 0
                last_error = None

                while retry_count < max_retries:
                    try:
                        logger.info(f"Attempting analysis {retry_count + 1}/{max_retries} for {file_name}")
                        
                        # Get response with timeout using Gemini
                        response = await asyncio.wait_for(
                            model.generate_content_async(
                                prompt,
                                generation_config={
                                    "temperature": 0.1,  # Lower temperature for more consistent output
                                    "max_output_tokens": 2048,
                                    "top_p": 0.8,
                                    "top_k": 40,
                                    "response_mime_type": "application/json"  # Force JSON response
                                }
                            ),
                            timeout=45  # Increased timeout
                        )
                        
                        # Better response handling
                        if not response or not hasattr(response, 'text'):
                            raise ValueError("Empty response from AI model")
                        
                        response_text = response.text.strip()
                        logger.info(f"Raw response length: {len(response_text)} chars")
                        
                        if not response_text:
                            raise ValueError("Empty response text from AI model")
                        
                        # Clean and extract JSON from response
                        structured_data = self._extract_and_parse_json(response_text)
                        
                        if not structured_data:
                            raise ValueError("Could not extract valid JSON from response")
                        
                        # Validate and clean the structured data
                        structured_data = self._validate_and_clean_data(structured_data)

                        # Ensure pitch_deck_url is included with the GCS URL
                        structured_data["pitch_deck_url"] = gcs_url
                        
                        # Start BigQuery storage in background
                        asyncio.create_task(
                            self._store_in_bigquery(vision_result, file_name, structured_data)
                        )
                        
                        logger.info(f"Successfully analyzed document: {file_name}")
                        return structured_data
                        
                    except asyncio.TimeoutError:
                        last_error = "Request timeout - model took too long to respond"
                        logger.warning(f"Attempt {retry_count + 1}: {last_error}")
                        
                    except Exception as e:
                        last_error = f"Analysis error: {str(e)}"
                        logger.warning(f"Attempt {retry_count + 1}: {last_error}")
                        logger.debug(f"Full error details: {repr(e)}")
                    
                    retry_count += 1
                    if retry_count < max_retries:
                        await asyncio.sleep(2 ** retry_count)  # Exponential backoff

                # If all retries failed, try with fallback model
                logger.warning(f"Primary model failed, trying fallback for {file_name}")
                fallback_result = await self._try_fallback_analysis(text_content, vision_result, file_name, gcs_url)
                if fallback_result:
                    return fallback_result

                # If everything failed, return structured error
                logger.error(f"Failed to process document after {max_retries} attempts: {last_error}")
                return {
                    "error": f"Failed to analyze document after {max_retries} attempts: {last_error}",
                    "company_name": "Analysis Failed",
                    "industry": "Unknown",
                    "pitch_deck_url": gcs_url,  # Include GCS URL even in error case
                    "raw_vision_data": vision_result
                }
                
            except Exception as model_error:
                logger.error(f"Error initializing AI model: {str(model_error)}")
                return {
                    "error": f"Failed to initialize AI models: {str(model_error)}",
                    "company_name": "Model Error",
                    "industry": "Unknown",
                    "pitch_deck_url": gcs_url,  # Include GCS URL even in error case
                    "raw_vision_data": vision_result
                }
                
        except Exception as e:
            logger.error(f"Unexpected error in document analysis: {str(e)}")
            return {
                "error": f"Unexpected error in document analysis: {str(e)}",
                "company_name": "System Error",
                "industry": "Unknown",
                "pitch_deck_url": gcs_url,  # Include GCS URL even in error case
                "raw_vision_data": vision_result
            }

    def _extract_and_parse_json(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Extract and parse JSON from AI response with multiple strategies"""
        try:
            # Strategy 1: Direct JSON parsing
            if response_text.strip().startswith('{'):
                return json.loads(response_text)
            
            # Strategy 2: Find JSON block within response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            
            # Strategy 3: Look for JSON between code blocks
            code_block_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', response_text, re.DOTALL | re.IGNORECASE)
            if code_block_match:
                json_str = code_block_match.group(1)
                return json.loads(json_str)
            
            # Strategy 4: Extract the largest JSON-like structure
            brace_count = 0
            start_idx = -1
            for i, char in enumerate(response_text):
                if char == '{':
                    if start_idx == -1:
                        start_idx = i
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0 and start_idx != -1:
                        potential_json = response_text[start_idx:i+1]
                        try:
                            return json.loads(potential_json)
                        except:
                            continue
            
            return None
            
        except json.JSONDecodeError as e:
            logger.warning(f"JSON decode error: {str(e)}")
            return None
        except Exception as e:
            logger.warning(f"Error extracting JSON: {str(e)}")
            return None

    def _validate_and_clean_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean extracted data"""
        # Ensure required fields exist
        cleaned_data = {
            "company_name": str(data.get("company_name", "Unknown")).strip() or "Unknown",
            "industry": str(data.get("industry", "Unknown")).strip() or "Unknown",
            "founding_year": None,
            "company_stage": str(data.get("company_stage", "Unknown")).strip() or "Unknown",
            "key_products": [],
            "target_market": str(data.get("target_market", "Unknown")).strip() or "Unknown",
            "competitive_advantage": str(data.get("competitive_advantage", "Unknown")).strip() or "Unknown", 
            "revenue_model": str(data.get("revenue_model", "Unknown")).strip() or "Unknown",
            "funding_status": str(data.get("funding_status", "Unknown")).strip() or "Unknown",
            "team_size": None
        }
        
        # Handle founding_year
        try:
            if data.get("founding_year") is not None:
                year = int(data["founding_year"])
                if 1800 <= year <= 2030:  # Reasonable year range
                    cleaned_data["founding_year"] = year
        except (ValueError, TypeError):
            pass
        
        # Handle team_size
        try:
            if data.get("team_size") is not None:
                size = int(data["team_size"])
                if 0 <= size <= 100000:  # Reasonable team size range
                    cleaned_data["team_size"] = size
        except (ValueError, TypeError):
            pass
        
        # Handle key_products
        try:
            products = data.get("key_products", [])
            if isinstance(products, list):
                cleaned_data["key_products"] = [str(p).strip() for p in products if p]
            elif isinstance(products, str):
                # Try to parse as JSON array or split by comma
                try:
                    parsed_products = json.loads(products)
                    if isinstance(parsed_products, list):
                        cleaned_data["key_products"] = [str(p).strip() for p in parsed_products if p]
                except:
                    # Split by comma as fallback
                    cleaned_data["key_products"] = [p.strip() for p in products.split(',') if p.strip()]
        except Exception:
            cleaned_data["key_products"] = []
        
        return cleaned_data

    async def _try_fallback_analysis(self, text_content: str, vision_result: Dict[str, Any], file_name: str, gcs_url: str = None) -> Optional[Dict[str, Any]]:
        """Try simpler analysis as fallback"""
        try:
            # Use Gemini Flash as fallback
            model = GenerativeModel("gemini-2.0-flash-exp")
            
            # Simpler prompt for fallback
            simple_prompt = f"""Extract basic company information from this text and return as JSON:

{text_content[:1000]}  

Return only this JSON format:
{{"company_name": "name or Unknown", "industry": "industry or Unknown"}}"""
            
            response = await asyncio.wait_for(
                model.generate_content_async(
                    simple_prompt,
                    generation_config={
                        "temperature": 0.0,
                        "max_output_tokens": 256,
                        "response_mime_type": "application/json"
                    }
                ),
                timeout=30
            )
            
            if response and hasattr(response, 'text') and response.text.strip():
                fallback_data = self._extract_and_parse_json(response.text.strip())
                if fallback_data:
                    # Fill in missing fields
                    result = {
                        "company_name": fallback_data.get("company_name", "Unknown"),
                        "industry": fallback_data.get("industry", "Unknown"),
                        "founding_year": None,
                        "company_stage": "Unknown",
                        "key_products": [],
                        "target_market": "Unknown",
                        "competitive_advantage": "Unknown",
                        "revenue_model": "Unknown", 
                        "funding_status": "Unknown",
                        "team_size": None,
                        "pitch_deck_url": gcs_url,  # Include GCS URL
                        "fallback_analysis": True
                    }
                    
                    # Store in BigQuery synchronously
                    try:
                        self._store_in_bigquery_sync(vision_result, file_name, result)
                    except Exception as storage_error:
                        logger.error(f"Failed to store fallback result: {str(storage_error)}")
                    
                    logger.info(f"Fallback analysis successful for {file_name}")
                    return result
            
        except Exception as e:
            logger.error(f"Fallback analysis also failed: {str(e)}")
        
        return None

    def _safe_json_dumps(self, obj: Any) -> str:
        """Safely serialize object to JSON, handling datetime and other non-serializable types"""
        def json_serializer(obj):
            """JSON serializer for objects not serializable by default json code"""
            if isinstance(obj, datetime):
                return obj.isoformat() + 'Z'
            elif hasattr(obj, 'isoformat'):  # Handle date objects
                return obj.isoformat()
            elif hasattr(obj, '__dict__'):  # Handle custom objects
                return obj.__dict__
            else:
                return str(obj)
        
        try:
            return json.dumps(obj, default=json_serializer, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Error serializing object to JSON: {str(e)}")
            # Try to serialize piece by piece to identify the problematic part
            try:
                if isinstance(obj, dict):
                    safe_obj = {}
                    for key, value in obj.items():
                        try:
                            # Test if this value can be serialized
                            json.dumps(value, default=json_serializer)
                            safe_obj[key] = value
                        except Exception:
                            # If it can't, convert to string
                            safe_obj[key] = str(value)
                    return json.dumps(safe_obj, default=json_serializer, ensure_ascii=False)
                elif isinstance(obj, list):
                    safe_obj = []
                    for item in obj:
                        try:
                            json.dumps(item, default=json_serializer)
                            safe_obj.append(item)
                        except Exception:
                            safe_obj.append(str(item))
                    return json.dumps(safe_obj, default=json_serializer, ensure_ascii=False)
                else:
                    return json.dumps(str(obj))
            except Exception as fallback_error:
                logger.error(f"Even fallback serialization failed: {str(fallback_error)}")
                return json.dumps({"error": f"Serialization failed: {str(e)}", "fallback_error": str(fallback_error)})

    def _store_in_bigquery_sync(self, vision_result: Dict[str, Any], file_name: str, structured_data: Dict[str, Any]) -> None:
        """Synchronous method to store document analysis in BigQuery - no datetime serialization issues"""
        try:
            # Create timestamp as string immediately - never use datetime objects
            timestamp_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f UTC')[:-7] + ' UTC'
            unique_id = str(int(datetime.utcnow().timestamp() * 1000000))
            
            # Pre-process raw_data to remove any datetime objects
            safe_vision_result = self._clean_datetime_objects(vision_result)
            
            # Get the pitch_deck_url from structured_data
            pitch_deck_url = structured_data.get("pitch_deck_url")
            
            # Create completely safe row data - all strings and basic types only
            safe_row = {
                "id": unique_id,
                "file_name": str(file_name) if file_name else "",
                "file_type": None,
                "analysis_timestamp": timestamp_str,
                "raw_data": json.dumps(safe_vision_result, default=str),  # Force string conversion for any remaining objects
                "company_name": str(structured_data.get("company_name")) if structured_data.get("company_name") else None,
                "industry": str(structured_data.get("industry")) if structured_data.get("industry") else None,
                "founding_year": int(structured_data["founding_year"]) if structured_data.get("founding_year") and str(structured_data["founding_year"]).isdigit() else None,
                "company_stage": str(structured_data.get("company_stage")) if structured_data.get("company_stage") else None,
                "key_products": json.dumps(structured_data.get("key_products", []) if structured_data.get("key_products") else []),
                "target_market": str(structured_data.get("target_market")) if structured_data.get("target_market") else None,
                "competitive_advantage": str(structured_data.get("competitive_advantage")) if structured_data.get("competitive_advantage") else None,
                "revenue_model": str(structured_data.get("revenue_model")) if structured_data.get("revenue_model") else None,
                "funding_status": str(structured_data.get("funding_status")) if structured_data.get("funding_status") else None,
                "team_size": int(structured_data["team_size"]) if structured_data.get("team_size") and str(structured_data["team_size"]).isdigit() else None,
                "startup_id": None,
                "processing_status": "completed" if not structured_data.get("error") else "error",
                "error_message": str(structured_data.get("error")) if structured_data.get("error") else None
            }
            
            # Ensure table exists
            self._ensure_doc_analysis_table_exists()
            
            # Get table reference
            table_ref = self.client.dataset(self.dataset_name).table(self.doc_analysis_table)
            
            # Insert using JSON method with completely clean data
            errors = self.client.insert_rows_json(table_ref, [safe_row])
            
            if errors:
                logger.error(f"BigQuery insertion failed: {errors}")
                # Try with even more minimal data
                minimal_row = {
                    "id": unique_id,
                    "file_name": str(file_name) if file_name else "unknown",
                    "analysis_timestamp": timestamp_str,
                    "raw_data": "{}",
                    "company_name": str(structured_data.get("company_name", "Unknown")),
                    "industry": str(structured_data.get("industry", "Unknown")),
                    "processing_status": "error",
                    "error_message": f"Original insertion failed: {str(errors)}"
                }
                
                retry_errors = self.client.insert_rows_json(table_ref, [minimal_row])
                if retry_errors:
                    logger.error(f"Minimal insertion also failed: {retry_errors}")
                else:
                    logger.info(f"Successfully stored minimal data for: {file_name}")
            else:
                logger.info(f"Successfully stored document data: {file_name}")
                
        except Exception as e:
            logger.error(f"Error in synchronous BigQuery storage: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
    
    def _clean_datetime_objects(self, obj: Any) -> Any:
        """Recursively clean datetime objects from nested structures"""
        if isinstance(obj, datetime):
            return obj.isoformat() + 'Z'
        elif isinstance(obj, dict):
            return {key: self._clean_datetime_objects(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._clean_datetime_objects(item) for item in obj]
        elif hasattr(obj, 'isoformat'):  # Other date-like objects
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):  # Custom objects
            return str(obj)
        else:
            return obj

    async def _store_in_bigquery(
        self,
        vision_result: Dict[str, Any],
        file_name: str,
        structured_data: Dict[str, Any]
    ) -> None:
        """Background task to store document analysis in BigQuery, linking to startups table"""
        try:
            analysis_timestamp = datetime.utcnow()

            # Serialize raw_data safely
            try:
                raw_data_str = self._safe_json_dumps(vision_result)
            except Exception as raw_error:
                logger.error(f"Raw data serialization failed: {str(raw_error)}")
                raw_data_str = json.dumps(
                    {"error": "Could not serialize vision result", "type": str(type(vision_result))}
                )

            # Get the pitch_deck_url from structured_data (it should already be set)
            pitch_deck_url = structured_data.get("pitch_deck_url")

            # Build safe structured row
            safe_row = {
                "file_name": str(file_name) if file_name else "",
                "company_name": str(structured_data.get("company_name")) if structured_data.get("company_name") else None,
                "industry": str(structured_data.get("industry")) if structured_data.get("industry") else None,
                "founding_year": int(structured_data["founding_year"]) if structured_data.get("founding_year") and str(structured_data["founding_year"]).isdigit() else None,
                "company_stage": str(structured_data.get("company_stage")) if structured_data.get("company_stage") else None,
                "key_products": json.dumps(structured_data.get("key_products", []) if structured_data.get("key_products") else []),
                "target_market": str(structured_data.get("target_market")) if structured_data.get("target_market") else None,
                "competitive_advantage": str(structured_data.get("competitive_advantage")) if structured_data.get("competitive_advantage") else None,
                "revenue_model": str(structured_data.get("revenue_model")) if structured_data.get("revenue_model") else None,
                "funding_status": str(structured_data.get("funding_status")) if structured_data.get("funding_status") else None,
                "team_size": int(structured_data["team_size"]) if structured_data.get("team_size") and str(structured_data["team_size"]).isdigit() else None,
                "processing_status": "completed" if not structured_data.get("error") else "error",
                "error_message": str(structured_data.get("error")) if structured_data.get("error") else None
            }

            loop = asyncio.get_event_loop()

            # ✅ 1. Insert (or upsert) into startups table
            try:
                startup_query = f"""
                MERGE `{self.dataset_name}.startups` T
                USING (SELECT @company_name AS company_name, @industry AS industry, @founding_year AS founded_year) S
                ON LOWER(T.name) = LOWER(S.company_name)
                WHEN MATCHED THEN
                UPDATE SET 
                    T.industry = S.industry, 
                    T.founded_year = S.founded_year, 
                    T.updated_at = CURRENT_TIMESTAMP(),
                    T.raw_data = @raw_data,
                    T.pitch_deck_url = @pitch_deck_url
                WHEN NOT MATCHED THEN
                INSERT (id, name, industry, founded_year, created_at, updated_at, raw_data, pitch_deck_url)
                VALUES (
                    CAST(FARM_FINGERPRINT(S.company_name) AS INT64),
                    S.company_name, 
                    S.industry, 
                    S.founded_year, 
                    CURRENT_TIMESTAMP(),
                    CURRENT_TIMESTAMP(),
                    @raw_data,
                    @pitch_deck_url
                )
                """

                startup_job_config = bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("company_name", "STRING", safe_row["company_name"]),
                        bigquery.ScalarQueryParameter("industry", "STRING", safe_row["industry"]),
                        bigquery.ScalarQueryParameter("founding_year", "INT64", safe_row["founding_year"]),
                        bigquery.ScalarQueryParameter("raw_data", "STRING", raw_data_str),
                        bigquery.ScalarQueryParameter("pitch_deck_url", "STRING", pitch_deck_url)
                    ]
                )

                await loop.run_in_executor(
                    None, lambda: self.client.query(startup_query, job_config=startup_job_config).result()
                )

                # Fetch the startup_id (just inserted or existing)
                get_startup_query = f"""
                SELECT id FROM `{self.dataset_name}.startups`
                WHERE LOWER(name) = LOWER(@company_name)
                LIMIT 1
                """
                get_startup_job_config = bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("company_name", "STRING", safe_row["company_name"]),
                    ]
                )
                startup_result = await loop.run_in_executor(
                    None, lambda: self.client.query(get_startup_query, job_config=get_startup_job_config).result()
                )
                startup_rows = [dict(row.items()) for row in startup_result]
                startup_id = startup_rows[0]["id"] if startup_rows else None

            except Exception as startup_error:
                logger.error(f"Startup insert/upsert failed: {str(startup_error)}")
                startup_id = None

            # ✅ 2. Insert into document_analysis with startup_id
            try:
                table_ref = self.client.dataset(self.dataset_name).table(self.doc_analysis_table)
                table = await loop.run_in_executor(None, lambda: self.client.get_table(table_ref))

                row_tuple = (
                    str(int(analysis_timestamp.timestamp() * 1000000)),  # id
                    safe_row["file_name"],
                    None,  # file_type
                    analysis_timestamp,
                    raw_data_str,
                    safe_row["company_name"],
                    safe_row["industry"],
                    safe_row["founding_year"],
                    safe_row["company_stage"],
                    safe_row["key_products"],
                    safe_row["target_market"],
                    safe_row["competitive_advantage"],
                    safe_row["revenue_model"],
                    safe_row["funding_status"],
                    safe_row["team_size"],
                    startup_id,  # ✅ foreign key reference
                    safe_row["processing_status"],
                    safe_row["error_message"],
                )

                errors = await loop.run_in_executor(
                    None, lambda: self.client.insert_rows(table, [row_tuple])
                )
                if errors:
                    logger.error(f"BigQuery insertion errors: {errors}")
                else:
                    logger.info(f"Inserted document for '{safe_row['company_name']}' linked to startup {startup_id}")

            except Exception as bq_error:
                logger.error(f"BigQuery insert failed: {str(bq_error)}", exc_info=True)

        except Exception as e:
            logger.error(f"Error in BigQuery storage task: {str(e)}", exc_info=True)

        
    def _ensure_doc_analysis_table_exists(self):
        """Create the document analysis table if it doesn't exist"""
        try:
            # First, check if dataset exists
            try:
                self.client.get_dataset(self.dataset_name)
                logger.info(f"Dataset {self.dataset_name} exists")
            except Exception:
                # Create dataset if it doesn't exist
                dataset = bigquery.Dataset(f"{self.client.project}.{self.dataset_name}")
                dataset.location = "asia-south1"  # Set to same region as Vertex AI
                self.client.create_dataset(dataset)
                logger.info(f"Created dataset {self.dataset_name}")

            # Now check if table exists
            table_id = f"{self.client.project}.{self.dataset_name}.{self.doc_analysis_table}"
            try:
                self.client.get_table(table_id)
                logger.info(f"Table {self.doc_analysis_table} exists")
            except Exception:
                # Create table if it doesn't exist
                schema = [
                    bigquery.SchemaField("id", "STRING"),
                    bigquery.SchemaField("file_name", "STRING"),
                    bigquery.SchemaField("file_type", "STRING"),
                    bigquery.SchemaField("analysis_timestamp", "TIMESTAMP"),
                    bigquery.SchemaField("raw_data", "STRING"),  # JSON string of Vision API response
                    bigquery.SchemaField("company_name", "STRING"),
                    bigquery.SchemaField("industry", "STRING"),
                    bigquery.SchemaField("founding_year", "INTEGER"),
                    bigquery.SchemaField("company_stage", "STRING"),
                    bigquery.SchemaField("key_products", "STRING"),  # JSON string array
                    bigquery.SchemaField("target_market", "STRING"),
                    bigquery.SchemaField("competitive_advantage", "STRING"),
                    bigquery.SchemaField("revenue_model", "STRING"),
                    bigquery.SchemaField("funding_status", "STRING"),
                    bigquery.SchemaField("team_size", "INTEGER"),
                    bigquery.SchemaField("startup_id", "INTEGER", mode="NULLABLE"),
                    bigquery.SchemaField("processing_status", "STRING"),
                    bigquery.SchemaField("error_message", "STRING")
                ]
                
                table = bigquery.Table(table_id, schema=schema)
                table = self.client.create_table(table)
                logger.info(f"Created table {self.doc_analysis_table}")
                
        except Exception as e:
            logger.error(f"Error ensuring table exists: {str(e)}")
            raise

    # ... rest of the methods remain the same
    async def fetch_startups(
        self,
        name: Optional[str] = None,
        status: Optional[StartupStatus] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Fetch startups from BigQuery with optional filters
        """
        query = f"""
        SELECT *
        FROM `{self.dataset_name}.{self.table_name}`
        WHERE 1=1
        """
        
        if name:
            query += f"\nAND LOWER(name) LIKE LOWER('%{name}%')"
            
        if status:
            query += f"\nAND status = '{status.value}'"
            
        query += f"\nLIMIT {limit}"
        
        query_job = self.client.query(query)
        results = query_job.result()
        
        return [dict(row.items()) for row in results]

    async def fetch_startup_by_id(self, startup_id: int) -> Optional[Dict[str, Any]]:
        """
        Fetch a specific startup by ID
        """
        query = f"""
        SELECT *
        FROM `{self.dataset_name}.{self.table_name}`
        WHERE id = {startup_id}
        LIMIT 1
        """
        
        query_job = self.client.query(query)
        results = query_job.result()
        
        for row in results:
            return dict(row.items())
        return None

    async def search_startups(self, search_params: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Advanced search with multiple parameters
        """
        query = f"""
        SELECT *
        FROM `{self.dataset_name}.{self.table_name}`
        WHERE 1=1
        """
        
        # Add dynamic filters based on search parameters
        for key, value in search_params.items():
            if value is not None:
                if isinstance(value, str):
                    query += f"\nAND LOWER({key}) LIKE LOWER('%{value}%')"
                elif isinstance(value, (int, float)):
                    query += f"\nAND {key} = {value}"
                elif isinstance(value, bool):
                    query += f"\nAND {key} = {str(value).lower()}"
                elif isinstance(value, list):
                    formatted_values = [f"'{v}'" if isinstance(v, str) else str(v) for v in value]
                    query += f"\nAND {key} IN ({','.join(formatted_values)})"

        query += "\nLIMIT 100"  # Safety limit
        
        query_job = self.client.query(query)
        results = query_job.result()
        
        return [dict(row.items()) for row in results]

    async def ingest_startup_data(self, startup: StartupCreate) -> Dict[str, Any]:
        """
        Ingest new startup data into BigQuery if company name does not already exist
        """
        try:
            # Check if company already exists (case-insensitive match)
            query = f"""
            SELECT id, name
            FROM `{self.dataset_name}.{self.table_name}`
            WHERE LOWER(name) = LOWER(@company_name)
            LIMIT 1
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("company_name", "STRING", startup.name)
                ]
            )

            query_job = self.client.query(query, job_config=job_config)
            results = query_job.result()

            existing = [dict(row.items()) for row in results]
            if existing:
                logger.info(f"Startup '{startup.name}' already exists with id {existing[0].get('id')}")
                return {
                    "message": f"Startup '{startup.name}' already exists",
                    "existing_record": existing[0]
                }

            # Prepare insert if not exists
            table_ref = self.client.dataset(self.dataset_name).table(self.table_name)
            table = self.client.get_table(table_ref)
            
            rows_to_insert = [{
                'name': startup.name,
                'website': startup.website,
                'status': startup.status.value if startup.status else StartupStatus.ACTIVE.value,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }]
            
            errors = self.client.insert_rows_json(table, rows_to_insert)
            
            if errors:
                raise Exception(f"Errors occurred while ingesting data: {errors}")
                
            logger.info(f"Inserted new startup '{startup.name}'")
            return rows_to_insert[0]

        except Exception as e:
            logger.error(f"Error in ingest_startup_data: {str(e)}")
            raise

    async def fetch_document_analysis(
        self,
        company_name: Optional[str] = None,
        industry: Optional[str] = None,
        founding_year_min: Optional[int] = None,
        founding_year_max: Optional[int] = None,
        company_stage: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Fetch document analysis records with optional filters"""

        # Validate year range
        if founding_year_min is not None and founding_year_max is not None:
            if founding_year_max < founding_year_min:
                raise ValueError("founding_year_max cannot be less than founding_year_min")

        filters = []
        params = []

        if company_name:
            filters.append("LOWER(company_name) LIKE LOWER(@company_name)")
            params.append(bigquery.ScalarQueryParameter("company_name", "STRING", f"{company_name}%"))

        if industry:
            filters.append("LOWER(industry) LIKE LOWER(@industry)")
            params.append(bigquery.ScalarQueryParameter("industry", "STRING", f"{industry}%"))

        if founding_year_min is not None:
            filters.append("founding_year >= @founding_year_min")
            params.append(bigquery.ScalarQueryParameter("founding_year_min", "INT64", founding_year_min))

        if founding_year_max is not None:
            filters.append("founding_year <= @founding_year_max")
            params.append(bigquery.ScalarQueryParameter("founding_year_max", "INT64", founding_year_max))

        if company_stage:
            filters.append("LOWER(company_stage) LIKE LOWER(@company_stage)")
            params.append(bigquery.ScalarQueryParameter("company_stage", "STRING", f"{company_stage}%"))

        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        query = f"""
        SELECT 
            id, file_name, analysis_timestamp, company_name, industry, founding_year,
            company_stage, key_products, target_market, competitive_advantage,
            revenue_model, funding_status, team_size, processing_status, error_message
        FROM `{self.dataset_name}.{self.doc_analysis_table}`
        {where_clause}
        ORDER BY analysis_timestamp DESC
        LIMIT @limit
        """

        params.append(bigquery.ScalarQueryParameter("limit", "INT64", limit))
        job_config = bigquery.QueryJobConfig(query_parameters=params)

        logger.info(f"Running query on document_analysis with filters: {filters}")

        loop = asyncio.get_event_loop()
        query_job = await loop.run_in_executor(None, lambda: self.client.query(query, job_config=job_config).result())
        rows = [dict(row.items()) for row in query_job]
        return rows
    
    async def update_pitch_deck_url(self, startup_id: int, pitch_deck_url: str) -> bool:
        """Update the pitch_deck_url for a specific startup"""
        try:
            query = f"""
            UPDATE `{self.dataset_name}.{self.table_name}`
            SET pitch_deck_url = @pitch_deck_url, updated_at = CURRENT_TIMESTAMP()
            WHERE id = @startup_id
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("pitch_deck_url", "STRING", pitch_deck_url),
                    bigquery.ScalarQueryParameter("startup_id", "INT64", startup_id)
                ]
            )
            
            query_job = self.client.query(query, job_config=job_config)
            query_job.result()  # Wait for completion
            
            logger.info(f"Updated pitch_deck_url for startup {startup_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating pitch_deck_url for startup {startup_id}: {str(e)}")
            return False
    
    async def fix_null_pitch_deck_urls(self, bucket_name: str, base_path: str = "documents") -> Dict[str, Any]:
        """Fix existing records with null pitch_deck_url by constructing URLs based on company name"""
        try:
            # Get all records with null pitch_deck_url
            query = f"""
            SELECT id, name
            FROM `{self.dataset_name}.{self.table_name}`
            WHERE pitch_deck_url IS NULL
            """
            
            query_job = self.client.query(query)
            results = query_job.result()
            
            updated_count = 0
            failed_count = 0
            
            for row in results:
                startup_id = row['id']
                company_name = row['name']
                
                # Construct GCS URL based on company name
                # You can modify this pattern based on your actual file naming convention
                safe_name = company_name.lower().replace(' ', '_').replace('-', '_')
                constructed_url = f"gs://{bucket_name}/{base_path}/{safe_name}.pdf"
                
                # Update the record
                success = await self.update_pitch_deck_url(startup_id, constructed_url)
                if success:
                    updated_count += 1
                else:
                    failed_count += 1
            
            return {
                "updated_count": updated_count,
                "failed_count": failed_count,
                "message": f"Updated {updated_count} records, {failed_count} failed"
            }
            
        except Exception as e:
            logger.error(f"Error in fix_null_pitch_deck_urls: {str(e)}")
            return {
                "updated_count": 0,
                "failed_count": 0,
                "error": str(e)
            }