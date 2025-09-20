import base64
import logging
from typing import Any, Dict, Optional

import httpx
from app.core.config import settings
import json
import re

logger = logging.getLogger(__name__)

class AgentService:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        # Fallback to the provided default if not in settings
        self.base_url = (
            base_url
            or getattr(settings, "AGENT_API_BASE_URL", None)
            or "https://pitch-analysis-634194827064.us-central1.run.app"
        )
        self.timeout = timeout

    async def invoke_session(self, user_id: str, session_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST /apps/startup-analyser/users/{userId}/sessions/{sessionId}
        """
        url = f"{self.base_url}/apps/startup-analyser/users/{user_id}/sessions/{session_id}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers={"accept": "application/json"})
        if resp.is_success:
            return resp.json()
        raise RuntimeError(f"Agent session invocation failed: {self._extract_error(resp)}")

    async def run_app(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST /run
        """
        url = f"{self.base_url}/run"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers={"accept": "application/json"})
        if resp.is_success:
            return resp.json()
        raise RuntimeError(f"Run invocation failed: {self._extract_error(resp)}")

    async def run_session_with_pdf(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        file_bytes: bytes,
        filename: str = "document.pdf",
        mime_type: str = "application/pdf",
        text: Optional[str] = None,
        role: str = "user",
        streaming: bool = False,
        state_delta: Optional[Dict[str, Any]] = None,
        session_bootstrap_payload: Optional[Dict[str, Any]] = None,
        parse_json: bool = True
    ) -> Dict[str, Any]:
        """
        1) Invokes the session endpoint (bootstrap).
        2) Encodes the file to base64 and calls /run with inlineData.
        """
        bootstrap = session_bootstrap_payload or {"additionalProp1": {}}
        await self.invoke_session(user_id, session_id, bootstrap)

        b64 = base64.b64encode(file_bytes).decode("utf-8")

        new_message = {
            "parts": [
                {
                    "inlineData": {
                        "displayName": filename or "document.pdf",
                        "data": b64,
                        "mimeType": mime_type or "application/pdf",
                    },
                    **({"text": text} if text else {}),
                }
            ],
            "role": role or "user",
        }

        run_payload: Dict[str, Any] = {
            "appName": app_name,
            "userId": user_id,
            "sessionId": session_id,
            "newMessage": new_message,
            "streaming": streaming,
        }
        if state_delta:
            run_payload["stateDelta"] = state_delta

        result = await self.run_app(run_payload)
        if not parse_json:
            return result

        # Extract text from content.parts[].text (handles list or single response)
        texts = self._extract_texts(result)
        if not texts:
            raise RuntimeError("No text parts found in agent response")

        # Try to find and parse a JSON block from the texts
        for t in texts:
            json_str = self._extract_json_string(t)
            parsed = self._try_parse_json(json_str)
            if parsed is not None:
                return parsed

        raise RuntimeError("Failed to parse JSON from agent response text")

    def _extract_error(self, resp: httpx.Response) -> str:
        try:
            data = resp.json()
            return data.get("detail") or str(data)
        except Exception:
            return f"HTTP {resp.status_code}"

    def _extract_texts(self, payload: Any) -> list[str]:
        """
        Collect all content.parts[].text strings from the response.
        The response may be a single dict or a list of dicts.
        """
        items = payload if isinstance(payload, list) else [payload]
        texts: list[str] = []
        for item in items:
            content = (item or {}).get("content") or {}
            parts = content.get("parts") or []
            for p in parts:
                t = (p or {}).get("text")
                if isinstance(t, str) and t.strip():
                    texts.append(t)
        return texts

    def _extract_json_string(self, text: str) -> str:
        """
        Extract JSON from possible fenced blocks like ```json ... ``` or fallback to raw text.
        """
        m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if m:
            return m.group(1).strip()
        return text.strip()

    def _try_parse_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Try strict json parsing; if it fails, slice between first '{' and last '}'.
        """
        try:
            return json.loads(text)
        except Exception:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    return json.loads(text[start : end + 1])
                except Exception:
                    return None
            return None

    async def invoke_benchmark_research(self, payload: dict) -> dict:
        """
        Invokes the /research endpoint on the benchmark agent.
        The payload should be a dict matching the expected API schema.
        """
        url = "https://benchmark-agent-634194827064.us-central1.run.app/research"
        logger.info("Invoking benchmark research: url=%s", url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "accept": "application/json",
                    "content-type": "application/json",
                }
            )
        logger.debug("POST %s -> %s %s", url, resp.status_code, resp.reason_phrase)
        if resp.is_success:
            return resp.json()
        logger.error("Benchmark research failed: %s", resp.text)
        raise RuntimeError(f"Benchmark research invocation failed: {resp.text}")

    async def get_benchmark_research_progress(self, research_id: str) -> dict:
        """
        Invokes the /research/{research_id}/progress endpoint on the benchmark agent.
        Returns the progress status as a dict.
        """
        url = f"https://benchmark-agent-634194827064.us-central1.run.app/research/{research_id}/progress"
        logger.info("Getting benchmark research progress: url=%s", url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                url,
                headers={
                    "accept": "application/json",
                }
            )
        logger.debug("GET %s -> %s %s", url, resp.status_code, resp.reason_phrase)
        if resp.is_success:
            return resp.json()
        logger.error("Benchmark research progress failed: %s", resp.text)
        raise RuntimeError(f"Benchmark research progress invocation failed: {resp.text}")

    async def get_benchmark_research_report(self, research_id: str) -> dict:
        """
        Invokes the /research/{research_id}/report endpoint on the benchmark agent.
        Returns the report as a dict.
        """
        url = f"https://benchmark-agent-634194827064.us-central1.run.app/research/{research_id}/report"
        logger.info("Getting benchmark research report: url=%s", url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                url,
                headers={
                    "accept": "application/json",
                }
            )
        logger.debug("GET %s -> %s %s", url, resp.status_code, resp.reason_phrase)
        if resp.is_success:
            return resp.json()
        logger.error("Benchmark research report failed: %s", resp.text)
        raise RuntimeError(f"Benchmark research report invocation failed: {resp.text}")