import base64
import logging
from typing import Any, Dict, Optional
from app.db.models.company import CompanyInformation
from sqlalchemy.orm import Session
import asyncio

import httpx
from app.core.config import settings
import json
import re

logger = logging.getLogger(__name__)

class AgentService:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 120.0):
        self.base_url = (
            base_url
            or getattr(settings, "AGENT_API_BASE_URL", None)
            or settings.AGENT_API_BASE_URL
        )
        self.benchmark_base_url = (
            getattr(settings, "BENCHMARK_AGENT_BASE_URL", None)
            or settings.BENCHMARK_AGENT_BASE_URL
        )
        self.dealnote_base_url = (
            getattr(settings, "DEALNOTE_AGENT_BASE_URL", None)
            or settings.DEALNOTE_AGENT_BASE_URL
        )
        self.timeout = httpx.Timeout(60.0, read=60.0, write=60.0, connect=30.0)

    async def invoke_session(self, app_name, user_id: str, session_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST /apps//users/{userId}/sessions/{sessionId}
        """
        url = f"{self.base_url}/apps/{app_name}/users/{user_id}/sessions/{session_id}"
        logger.info("Invoking session: url=%s user=%s session=%s", url, user_id, session_id)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers={"accept": "application/json"})
        if resp.is_success:
            logger.info("Session invoked successfully: %s", resp.json())
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
        app_name = "startup-analyser"
        try:
            apps_url = f"{self.base_url}/list-apps"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                apps_resp = await client.get(apps_url, headers={"accept": "application/json"})
            if apps_resp.is_success:
                data = apps_resp.json()
                if isinstance(data, list) and data:
                    app_name = str(data[0])
                else:
                    logger.warning("Unexpected list-apps response shape: %s", data)
            else:
                logger.warning("list-apps request failed: %s %s", apps_resp.status_code, apps_resp.text)
        except Exception as e:
            logger.warning("Error fetching app name from list-apps: %s", e)

        bootstrap = session_bootstrap_payload or {"additionalProp1": {}}

        await self.invoke_session(app_name, user_id, session_id, bootstrap)

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

        print(run_payload['appName'], run_payload['userId'], run_payload['sessionId'], run_payload['streaming'])
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

        raise RuntimeError("Failed to parse JSON from agent response text", texts)

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
        Also handles cases where the block starts with ```json but has no closing fence.
        """
        t = text.strip()
        m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", t, re.IGNORECASE)
        if m:
            return m.group(1).strip()
        # Handle a starting fence without a closing one: drop the first line (``` or ```json)
        if t.startswith("```"):
            lines = t.splitlines()
            if lines:
                t = "\n".join(lines[1:]).strip()
        return t

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

    async def invoke_benchmark_research(self, payload: dict, company_id: int, db: Session) -> dict:
        """
        Invokes the /research endpoint on the benchmark agent.
        After success, updates the CompanyInformation record:
        - Sets benchmark_status to 'STARTED'
        - Sets benchmark_job_id to the returned job_id
        """
        url = f"{self.benchmark_base_url}/research"
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
        if not resp.is_success:
            logger.error("Benchmark research failed: %s", resp.text)
            raise RuntimeError(f"Benchmark research invocation failed: {resp.text}")

        result = resp.json()
        job_id = result.get("job_id")
        if not job_id:
            logger.error("No job_id found in benchmark research response")
            raise RuntimeError("No job_id found in benchmark research response")

        db_company = db.query(CompanyInformation).filter(CompanyInformation.id == company_id).first()
        if db_company:
            db_company.benchmark_status = "STARTED"
            db_company.benchmark_job_id = job_id
            db.commit()
            db.refresh(db_company)
            logger.info("Updated CompanyInformation id=%s: benchmark_status=STARTED, benchmark_job_id=%s", company_id, job_id)
        else:
            logger.warning("CompanyInformation id=%s not found for benchmark update", company_id)

        return result

    async def get_benchmark_research_progress(self, research_id: str, company_id: int, db: Session) -> dict:
        """
        Invokes the /research/{research_id}/progress endpoint on the benchmark agent.
        Updates the CompanyInformation record's benchmark_status based on progress_percentage:
        - 'IN_PROGRESS' if 0 < progress < 100
        - 'COMPLETE' if progress == 100
        Returns the progress status as a dict.
        """
        url = f"{self.benchmark_base_url}/research/{research_id}/progress"
        logger.info("Getting benchmark research progress: url=%s", url)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                url,
                headers={
                    "accept": "application/json",
                }
            )
        logger.debug("GET %s -> %s %s", url, resp.status_code, resp.reason_phrase)
        if not resp.is_success:
            logger.error("Benchmark research progress failed: %s", resp.text)
            raise RuntimeError(f"Benchmark research progress invocation failed: {resp.text}")

        result = resp.json()
        progress = result.get("progress_percentage")
        new_status = None
        if isinstance(progress, (int, float)):
            if progress == 100:
                new_status = "COMPLETE"
            elif progress > 0:
                new_status = "IN_PROGRESS"

        # Update CompanyInformation in DB
        from app.db.models.company import CompanyInformation
        db_company = db.query(CompanyInformation).filter(CompanyInformation.id == company_id).first()
        if db_company and new_status:
            db_company.benchmark_status = new_status
            db.commit()
            db.refresh(db_company)
            logger.info("Updated CompanyInformation id=%s: benchmark_status=%s", company_id, new_status)
        elif not db_company:
            logger.warning("CompanyInformation id=%s not found for benchmark progress update", company_id)

        return result

    async def get_benchmark_research_report(self, research_id: str) -> dict:
        """
        Invokes the /research/{research_id}/report endpoint on the benchmark agent.
        Returns the report as a dict.
        """
        url = f"{self.benchmark_base_url}/research/{research_id}/report"
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

    async def invoke_dealnote_session(self, app_name:str, user_id: str, session_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        POST https://dealnote-agent-.../apps/dealnote-agent/users/{user_id}/sessions/{session_id}
        Payload is passed through as-is.
        """
        dealnote_base = self.dealnote_base_url
        url = f"{dealnote_base}/apps/{app_name}/users/{user_id}/sessions/{session_id}"
        logger.info("Invoking dealnote session: url=%s user=%s session=%s", url, user_id, session_id)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                url,
                json=payload,
                headers={
                    "accept": "application/json",
                    "content-type": "application/json",
                },
            )
        logger.debug("POST %s -> %s %s", url, resp.status_code, resp.reason_phrase)
        if resp.is_success:
            return resp.json()
        logger.error("Dealnote session failed: %s", resp.text)
        raise RuntimeError(f"Dealnote session invocation failed: {self._extract_error(resp)}")

    async def run_dealnote_app(
        self,
        *,
        user_id: str,
        session_id: str,
        payload: Dict[str, Any],
        streaming: bool = False,
        state_delta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        The payload argument is stringified and sent in newMessage.parts[0].text.
        """
        dealnote_base = self.dealnote_base_url
        url = f"{dealnote_base}/run"

        app_name = "dealnote-agent"
        try:
            apps_url = f"{dealnote_base}/list-apps"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                apps_resp = await client.get(
                    apps_url,
                    headers={"accept": "application/json"},
                )
            if apps_resp.is_success:
                data = apps_resp.json()
                if isinstance(data, list) and data:
                    app_name = str(data[0])
                else:
                    logger.warning("Unexpected list-apps response shape: %s", data)
            else:
                logger.warning("list-apps request failed: %s %s", apps_resp.status_code, apps_resp.text)
        except Exception as e:
            logger.warning("Error fetching app name from dealnote list-apps: %s", e)

        await self.invoke_dealnote_session(app_name, user_id, session_id, {})


        run_payload = {
            "appName": app_name,
            "userId": user_id,
            "sessionId": session_id,
            "newMessage": {
                "parts": [
                    {
                        "text": json.dumps(payload)
                    }
                ],
                "role": "user"
            },
            "streaming": streaming,
            "stateDelta": state_delta if state_delta is not None else {"additionalProp1": {}}
        }
        logger.info("Calling dealnote /run: url=%s", url)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(
                url,
                json=run_payload,
                headers={
                    "accept": "application/json",
                    "content-type": "application/json",
                },
            )
        logger.debug("POST %s -> %s %s", url, resp.status_code, resp.reason_phrase)
        if not resp.is_success:
            logger.error("Dealnote /run failed: %s", resp.text)
            raise RuntimeError(f"Dealnote run invocation failed: {self._extract_error(resp)}")

        result = resp.json()

        texts = self._extract_texts(result)
        if not texts:
            logger.error("No text parts found in dealnote /run response")
            raise RuntimeError("No text parts found in dealnote /run response")

        for t in texts:
            json_str = self._extract_json_string(t)
            parsed = self._try_parse_json(json_str)
            if parsed is not None:
                return parsed

        logger.error("Failed to parse JSON from dealnote /run response text")
        raise RuntimeError("Failed to parse JSON from dealnote /run response text")

    async def create_dealnote_session_and_run(
        self,
        *,
        user_id: str,
        session_id: str,
        run_payload: Dict[str, Any],
        streaming: bool = False,
        state_delta: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Convenience helper that:
        1) Creates a Dealnote session (with empty payload)
        2) Triggers /run with the provided payload
        Returns the response from /run.
        """
        return await self.run_dealnote_app(
            user_id=user_id,
            session_id=session_id,
            payload=run_payload,
            streaming=streaming,
            state_delta=state_delta
        )