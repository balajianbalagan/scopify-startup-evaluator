import httpx
import json
from typing import Dict, Any, Optional
from fastapi import HTTPException, status

from app.core.config import settings


class GoogleAIService:
    def __init__(self):
        self.api_key = settings.GOOGLE_AI_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        
        if not self.api_key:
            raise ValueError("Google AI API key is not configured")

    async def search_company_information(self, company_name: str, custom_query: Optional[str] = None) -> Dict[str, Any]:
        """
        Search for company information using Google AI Studio.
        """
        try:
            # Create a comprehensive search prompt
            search_query = custom_query or f"""
            Please provide comprehensive information about the company "{company_name}". 
            Include the following details if available:
            1. Company overview and description
            2. Industry and business sector
            3. Founded year and location
            4. Key executives and leadership
            5. Products and services offered
            6. Recent news and developments
            7. Financial information (if publicly available)
            8. Company size and employee count
            9. Website and social media presence
            10. Any notable partnerships or collaborations
            
            Please format the response as a structured JSON object with clear categories.
            If information is not available for any category, please indicate "Information not available".
            """
            
            # Prepare the request payload for Google AI Studio
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": search_query.strip()
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.7,
                    "topK": 40,
                    "topP": 0.95,
                    "maxOutputTokens": 2048,
                }
            }
            
            # Make the API request
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/models/gemini-1.5-flash:generateContent?key={self.api_key}",
                    headers={
                        "Content-Type": "application/json",
                    },
                    json=payload
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Google AI API error: {response.status_code} - {response.text}"
                    )
                
                result = response.json()
                
                # Extract the generated content
                if "candidates" not in result or not result["candidates"]:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="No response generated from Google AI"
                    )
                
                generated_text = result["candidates"][0]["content"]["parts"][0]["text"]
                
                # Try to parse as JSON, if it fails, return as structured text
                try:
                    parsed_info = json.loads(generated_text)
                except json.JSONDecodeError:
                    # If not valid JSON, structure it as a text response
                    parsed_info = {
                        "raw_response": generated_text,
                        "company_name": company_name,
                        "search_timestamp": None,  # Will be set by the calling function
                        "format": "text"
                    }
                
                return {
                    "company_name": company_name,
                    "information": parsed_info,
                    "search_query": search_query,
                    "ai_model": "gemini-1.5-flash",
                    "status": "success"
                }
                
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Request to Google AI API timed out"
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to Google AI API: {str(e)}"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Unexpected error: {str(e)}"
            )

    def validate_api_key(self) -> bool:
        """Validate if the API key is properly configured."""
        return self.api_key is not None and len(self.api_key.strip()) > 0


# Create a singleton instance
google_ai_service = GoogleAIService()
