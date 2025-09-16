
## `app/services/pitchdeck_ai_service.py`

import httpx
import json
from typing import Dict, Any
from fastapi import HTTPException, status

from app.core.config import settings


class PitchdeckAIService:
    def __init__(self):
        self.api_key = settings.SCOPIFY_GOOGLE_AI_API_KEY
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"

        if not self.api_key:
            raise ValueError("Google AI API key is not configured")

    async def summarize_structured_data(self, structured: Dict[str, Any], filename: str) -> Dict[str, Any]:
        """
        Take normalized structured data from Doc processor and return a JSON with analytical sections.
        """
        # Compose a prompt that uses both the flattened text and slide-by-slide context
        text = structured.get("text", "")
        slides = structured.get("slides", [])

        slides_summary = "\n".join(
            [f"Slide {s.get('slide')}: {' | '.join(s.get('texts', [])[:3])}" for s in slides]
        )

        prompt = f"""
You are an investment analyst. Given the extracted content from a pitchdeck, produce a JSON object with the following keys:
- company_info (name, logo, website, HQ, sector, stage, intro_source)
- deal_context (why_now, round_size, valuation, lead_investor, syndicate)
- company_overview (one_liner, mission, problem_snapshot, solution_snapshot)
- founder_assessment (bios, prior_experience, founder_market_fit, communication_style, coachability)
- traction_metrics (revenue, arr, gmvs, users_customers, growth, key_kpis)
- product_technology (product_details, moat, roadmap, defensibility)
- market_competition (tam_sam_som, trends, competitors, differentiation)
- risks_concerns (business_model_risk, adoption_risk, team_gaps, competitive_threats)
- deal_dynamics (valuation_vs_traction, thesis_fit, other_vc_interest, timeline_urgency)
- internal_notes_next_steps (analyst_commentary, diligence_questions, recommendation)
- valuation_multiples (ev_revenue, ev_ebitda, p_e, ev_gmv, ev_users, ev_arr)

Return valid JSON only.

Context text:
"""

        # Truncate if too large (best-effort)
        max_context = 20000
        combined = (text or "") + "\n\n" + slides_summary
        if len(combined) > max_context:
            combined = combined[:max_context]

        full_prompt = prompt + "\n\n" + combined

        payload = {
            "contents": [{"parts": [{"text": full_prompt.strip()}]}],
            "generationConfig": {
                "temperature": 0.2,
                "topK": 40,
                "topP": 0.95,
                "maxOutputTokens": 4096,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{self.base_url}/models/gemini-1.5-pro:generateContent?key={self.api_key}",
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )

            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Google AI API error: {resp.status_code} - {resp.text}",
                )

            result = resp.json()
            if "candidates" not in result or not result["candidates"]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No response generated from Google AI",
                )

            generated_text = result["candidates"][0]["content"]["parts"][0]["text"]

            try:
                parsed = json.loads(generated_text)
            except json.JSONDecodeError:
                # Best-effort fallback: wrap raw text
                parsed = {"raw_response": generated_text}

            return {
                "filename": filename,
                "structured_summary": parsed,
                "ai_model": "gemini-1.5-pro",
                "status": "success",
            }

        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_408_REQUEST_TIMEOUT,
                detail="Request to Google AI API timed out",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error connecting to Google AI API: {str(e)}",
            )


pitchdeck_ai_service = PitchdeckAIService()
