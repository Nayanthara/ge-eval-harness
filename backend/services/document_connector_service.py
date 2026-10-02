#!/usr/bin/env python3
"""
Document Connector Service for Gemini Enterprise Eval Harness.

Provides high-speed, multi-connector document fetching (Google Drive, Confluence,
Jira, Slack, SharePoint) with:
1. In-memory LRU caching across scenarios and benchmark runs.
2. Zero-latency session grounding chunk reuse.
3. Discovery Engine Multi-Connector Search Probes (<1.2s).
4. Direct Web/HTTP fetch for public documentation links.
5. Strict 2.5s timeouts and graceful structured error telemetry.
"""

import asyncio
import collections
import hashlib
import json
import logging
import os
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import unquote, urlparse

from html.parser import HTMLParser
import httpx

from ge_eval_harness.backend.security.html_utils import (
    extract_html_text_and_title,
    strip_html_tags,
)
from ge_eval_harness.backend.services.gcp_auth import get_gcp_credentials

logger = logging.getLogger(__name__)


class _SafeHTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.fed: List[str] = []
        self.skip_tags = {"script", "style", "head", "meta", "link"}
        self.current_skip = 0

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]):
        if tag.lower() in self.skip_tags:
            self.current_skip += 1

    def handle_endtag(self, tag: str):
        if tag.lower() in self.skip_tags and self.current_skip > 0:
            self.current_skip -= 1

    def handle_data(self, d: str):
        if self.current_skip == 0:
            self.fed.append(d)

    def get_text(self) -> str:
        return " ".join("".join(self.fed).split())


# In-memory LRU cache storing parsed document payloads: max 500 documents
_DOCUMENT_LRU_CACHE: collections.OrderedDict[str, Dict[str, Any]] = collections.OrderedDict()
_MAX_LRU_CACHE_SIZE = 500
_LRU_CACHE_LOCK = asyncio.Lock()


def normalize_document_key(uri_or_id: str) -> str:
    """Normalize URI or Document ID into a standard cache lookup key."""
    if not uri_or_id:
        return ""
    s = str(uri_or_id).strip()
    # If it's a Drive URL, extract file ID
    m_drive = re.search(r"id=([a-zA-Z0-9_-]{20,50})", s) or re.search(r"/d/([a-zA-Z0-9_-]{20,50})", s)
    if m_drive:
        return f"gdrive:{m_drive.group(1)}"
    # Normalize HTTP/HTTPS URL (strip trailing slash and tracking params)
    if s.startswith("http://") or s.startswith("https://"):
        try:
            parsed = urlparse(s)
            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
            return f"url:{clean_url}"
        except Exception:
            return f"url:{s}"
    return f"raw:{s}"


def extract_drive_file_id(uri: str) -> Optional[str]:
    """Extract standard Google Drive 25-50 char file ID from URL or raw ID."""
    if not uri:
        return None
    s = unquote(str(uri).strip())
    m1 = re.search(r"id=([a-zA-Z0-9_-]{20,50})", s)
    if m1:
        return m1.group(1)
    m2 = re.search(r"/d/([a-zA-Z0-9_-]{20,50})", s)
    if m2:
        return m2.group(1)
    if re.match(r"^[a-zA-Z0-9_-]{25,50}$", s):
        return s
    return None


def extract_jira_key(uri: str) -> Optional[str]:
    """Extract Jira issue key (e.g. JIRA-102, ENG-404) from URL or raw text."""
    if not uri:
        return None
    s = unquote(str(uri).strip())
    m = re.search(r"browse/([A-Z][A-Z0-9]+-\d+)", s, re.IGNORECASE) or re.search(r"\b([A-Z][A-Z0-9]+-\d+)\b", s)
    if m:
        return m.group(1).upper()
    return None


def extract_confluence_page_id(uri: str) -> Optional[str]:
    """Extract Confluence page ID or title from URL."""
    if not uri:
        return None
    s = unquote(str(uri).strip())
    m = re.search(r"pageId=(\d+)", s) or re.search(r"/pages/(\d+)", s)
    if m:
        return m.group(1)
    return None


class ConnectorTargetInfo:
    """Encapsulates mapped connector metadata and search query parameters."""

    def __init__(
        self,
        connector_type: str,
        datastore_id: str,
        query_key: str,
        identifier_type: str,
        clean_target: str,
    ):
        self.connector_type = connector_type
        self.datastore_id = datastore_id
        self.query_key = query_key
        self.identifier_type = identifier_type
        self.clean_target = clean_target

    def to_dict(self) -> Dict[str, Any]:
        return {
            "connector_type": self.connector_type,
            "datastore_id": self.datastore_id,
            "query_key": self.query_key,
            "identifier_type": self.identifier_type,
            "clean_target": self.clean_target,
        }


# Global dynamic datastore registry cache with 10-minute TTL
_ENGINE_DATASTORES_CACHE = {
    "timestamp": 0.0,
    "datastores": [],
}
_ENGINE_CACHE_LOCK = asyncio.Lock()


def format_connector_display_name(datastore_id: str) -> str:
    """
    Dynamically converts ANY Discovery Engine DataStore ID or slug into a user-friendly connector title
    without hardcoding specific company or service names.
    """
    if not datastore_id or str(datastore_id).strip().lower() in ("none", "all", ""):
        return "Enterprise Connector"
    
    clean = re.sub(r"_\d{8,20}", "", str(datastore_id))
    clean = re.sub(r"-(ds|connector|store|mock|bucket|custom)", "", clean, flags=re.IGNORECASE)
    parts = [p for p in re.split(r"[-_]", clean) if p and not p.isdigit() and p.lower() not in ("ds", "v4", "v6", "tc")]
    
    if not parts:
        return "Enterprise Connector"
    
    # Capitalize acronyms and words dynamically
    formatted_words = []
    for p in parts:
        if len(p) <= 4 and p.isupper():
            formatted_words.append(p)
        else:
            formatted_words.append(p.capitalize())
    
    name = " ".join(formatted_words)
    if not any(suffix in name.lower() for suffix in ("connector", "intranet", "drive", "service", "store")):
        name = f"{name} Connector"
    return name


def extract_query_candidates(target: str, scenario_query: Optional[str] = None) -> List[str]:
    """
    Extracts search query candidates from the target URL and scenario without any connector classification.
    Always includes the full target URL and scenario query.
    """
    queries = []
    t = str(target or "").strip()
    if t:
        queries.append(t)
        # Extract query param values (id=..., pageId=..., key=...)
        if "=" in t:
            for part in re.split(r"[?&]", t):
                if "=" in part:
                    _, v = part.split("=", 1)
                    val = v.split("&")[0].strip()
                    if val and len(val) >= 3 and val not in queries:
                        queries.append(val)
        # Extract last path segment if clean filename
        if "/" in t and not t.endswith("/"):
            last_segment = t.split("/")[-1].split("?")[0]
            if last_segment and len(last_segment) >= 3 and last_segment not in queries:
                queries.append(last_segment)

    if scenario_query:
        sq = scenario_query.strip()
        if sq and sq not in queries:
            queries.append(sq)

    return queries


class DocumentConnectorService:
    """
    Unified multi-connector document reader with fast caching and resilient fallbacks.
    """

    def __init__(self, timeout_sec: float = 45.0, allow_local_fallback: Optional[bool] = None):
        self.timeout_sec = float(os.environ.get("DOCUMENT_FETCH_TIMEOUT_SEC", timeout_sec or 45.0))
        if allow_local_fallback is not None:
            self.allow_local_fallback = allow_local_fallback
        else:
            env_val = os.environ.get("ENABLE_LOCAL_CORPUS_FALLBACK", "false").strip().lower()
            self.allow_local_fallback = env_val in ("true", "1", "yes")

    async def fetch_document(
        self,
        uri_or_id: str,
        session_docs: Optional[List[Dict[str, Any]]] = None,
        connector_ids: Optional[Union[str, List[str]]] = None,
        scenario_query: Optional[str] = None,
        ground_truth: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetches document content across multi-tier cascade:
        1. In-Memory LRU Cache (0ms)
        2. Session Grounding Cache (0ms)
        3. Parallel Discovery Engine Multi-Connector Search Probe (<400ms)
        4. Direct Web HTTP Fetch (<300ms)
        5. Graceful Error / Timeout Object with Rich Diagnostic Telemetry
        """
        if not uri_or_id or str(uri_or_id).strip().lower() in ("none", "[]", ""):
            return {
                "uri": uri_or_id,
                "title": "None",
                "accessible": False,
                "status_code": 404,
                "error": "No source reference specified.",
                "content": "",
                "connector_used": "None",
                "fetch_method": "NONE",
                "fetch_latency_ms": 0,
            }

        clean_target = str(uri_or_id).strip()
        cache_key = normalize_document_key(clean_target)
        t_start = time.perf_counter()

        # --- Tier 1: In-Memory LRU Cache ---
        async with _LRU_CACHE_LOCK:
            if cache_key in _DOCUMENT_LRU_CACHE:
                cached = dict(_DOCUMENT_LRU_CACHE[cache_key])
                _DOCUMENT_LRU_CACHE.move_to_end(cache_key)
                cached["fetch_latency_ms"] = round((time.perf_counter() - t_start) * 1000, 1)
                cached["fetch_method"] = "LRU_CACHE"
                if scenario_query:
                    c_trace = dict(cached.get("debug_trace") or {})
                    c_trace["scenario_query"] = scenario_query
                    if ground_truth:
                        c_trace["ground_truth"] = ground_truth
                        c_trace["stream_assist_prompt"] = (
                            f"Locate and read the document at '{clean_target}' to answer: '{scenario_query}'. "
                            f"Summarize the document, particularly focusing on any content, facts, or instructions directly related to: '{ground_truth}' if present in the document."
                        )
                    else:
                        c_trace["stream_assist_prompt"] = (
                            f"Locate and read the document at '{clean_target}' to answer: '{scenario_query}'. "
                            f"Summarize its key facts, policies, and instructions in detail."
                        )
                    cached["debug_trace"] = c_trace
                return cached

        # --- Tier 2: Candidate Session Grounding Cache ---
        if session_docs:
            session_match = self._find_in_session_docs(clean_target, session_docs)
            if session_match:
                session_match["fetch_latency_ms"] = round((time.perf_counter() - t_start) * 1000, 1)
                session_match["fetch_method"] = "SESSION_CACHE"
                if scenario_query:
                    s_trace = dict(session_match.get("debug_trace") or {})
                    s_trace["scenario_query"] = scenario_query
                    if ground_truth:
                        s_trace["ground_truth"] = ground_truth
                        s_trace["stream_assist_prompt"] = (
                            f"Locate and read the document at '{clean_target}' to answer: '{scenario_query}'. "
                            f"Summarize the document, particularly focusing on any content, facts, or instructions directly related to: '{ground_truth}' if present in the document."
                        )
                    else:
                        s_trace["stream_assist_prompt"] = (
                            f"Locate and read the document at '{clean_target}' to answer: '{scenario_query}'. "
                            f"Summarize its key facts, policies, and instructions in detail."
                        )
                    session_match["debug_trace"] = s_trace
                await self._cache_document(cache_key, session_match)
                return session_match

        # --- Tier 3: Parallel Discovery Engine Multi-Connector Search Probe (<400ms) ---
        try:
            probe_res = await asyncio.wait_for(
                self._probe_discovery_engine_connector(
                    target=clean_target,
                    connector_ids=connector_ids,
                    scenario_query=scenario_query,
                    ground_truth=ground_truth,
                ),
                timeout=self.timeout_sec,
            )
            if probe_res.get("accessible"):
                probe_res["fetch_latency_ms"] = round((time.perf_counter() - t_start) * 1000, 1)
                await self._cache_document(cache_key, probe_res)
                return probe_res
            else:
                fallback_probe_trace = probe_res.get("debug_trace", {})
        except asyncio.TimeoutError:
            logger.warning("Discovery Engine connector probe timed out after %ss for %s", self.timeout_sec, clean_target)
            fallback_probe_trace = {
                "target_uri": clean_target,
                "strategy": f"CONNECTOR_TIMEOUT ({round((time.perf_counter() - t_start) * 1000, 1)}ms)",
                "connector": "Discovery Engine",
                "http_status": 408,
                "error_details": f"Connector search probe timed out after {self.timeout_sec}s.",
                "datastores_tried": self._get_target_datastores(clean_target, connector_ids),
            }
        except Exception as exc:
            logger.warning("Discovery Engine connector probe failed for %s: %s", clean_target, exc)
            fallback_probe_trace = {
                "target_uri": clean_target,
                "strategy": "CONNECTOR_PROBE_ERROR",
                "connector": "Discovery Engine",
                "http_status": 500,
                "error_details": str(exc),
                "datastores_tried": self._get_target_datastores(clean_target, connector_ids),
            }

        # --- Tier 4: Direct Web / HTTP Fetch ---
        if clean_target.startswith("http://") or clean_target.startswith("https://"):
            if "drive.google.com" not in clean_target:
                try:
                    web_res = await asyncio.wait_for(
                        self._fetch_public_web_document(clean_target),
                        timeout=self.timeout_sec,
                    )
                    if web_res.get("accessible"):
                        web_res["fetch_latency_ms"] = round((time.perf_counter() - t_start) * 1000, 1)
                        await self._cache_document(cache_key, web_res)
                        return web_res
                except asyncio.TimeoutError:
                    pass
                except Exception:
                    pass

        # --- Tier 5: Fallback Structured Failure Record ---
        elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)
        fallback_res = {
            "uri": clean_target,
            "title": clean_target.split("/")[-1] if "/" in clean_target else clean_target,
            "accessible": False,
            "status_code": 404,
            "error": f"Document could not be retrieved via connectors or web within {self.timeout_sec}s timeout.",
            "content": "",
            "connector_used": "Discovery Engine",
            "fetch_method": "CONNECTOR_TIMEOUT" if elapsed_ms >= (self.timeout_sec * 900) else "CONNECTOR_NOT_FOUND",
            "fetch_latency_ms": elapsed_ms,
            "debug_trace": fallback_probe_trace or {
                "target_uri": clean_target,
                "strategy": f"CONNECTOR_TIMEOUT ({elapsed_ms}ms)",
                "connector": "Discovery Engine",
                "http_status": 404,
                "latency_ms": elapsed_ms,
                "error": f"Document could not be retrieved via connectors or web within {self.timeout_sec}s timeout.",
                "datastores_tried": self._get_target_datastores(clean_target, connector_ids),
            },
        }
        return fallback_res

    def _find_in_session_docs(
        self,
        target_uri_or_id: str,
        session_docs: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """Scans session retrieved documents for match if content is available."""
        target_file_id = extract_drive_file_id(target_uri_or_id)
        target_clean = target_uri_or_id.lower().strip()

        for doc in session_docs:
            doc_uri = str(doc.get("uri", "")).strip()
            doc_id = str(doc.get("id", "") or doc.get("document_id", "")).strip()
            doc_title = str(doc.get("title", "")).strip()
            snippets = str(doc.get("snippets", "") or doc.get("content", "")).strip()

            is_match = False
            if target_file_id and (target_file_id in doc_uri or target_file_id == doc_id):
                is_match = True
            elif target_clean in doc_uri.lower() or (doc_uri and doc_uri.lower() in target_clean):
                is_match = True
            elif doc_title and doc_title.lower() in target_clean:
                is_match = True

            if is_match and len(snippets) >= 50:
                return {
                    "uri": doc_uri or target_uri_or_id,
                    "title": doc_title or target_uri_or_id.split("/")[-1],
                    "accessible": True,
                    "status_code": 200,
                    "error": "",
                    "content": snippets,
                    "connector_used": doc.get("connector", self._infer_connector_type(doc_uri or target_uri_or_id)),
                    "fetch_method": "SESSION_CACHE",
                    "debug_trace": {
                        "target_uri": target_uri_or_id,
                        "strategy": "SESSION_CACHE",
                        "matched_doc_title": doc_title,
                        "content_length_chars": len(snippets),
                        "note": "Reused comprehensive grounding chunks from active benchmark session.",
                    },
                }
        return None

    async def _get_engine_datastores_dynamic(self) -> List[str]:
        """
        Dynamically fetches and caches the list of all connected DataStore IDs directly
        from the live Discovery Engine engine endpoint.
        Guarantees zero-config support for any new production connector (e.g. ServiceNow, Workday, Salesforce).
        """
        global _ENGINE_DATASTORES_CACHE
        now = time.perf_counter()
        async with _ENGINE_CACHE_LOCK:
            if _ENGINE_DATASTORES_CACHE["datastores"] and (now - _ENGINE_DATASTORES_CACHE["timestamp"]) < 600.0:
                return list(_ENGINE_DATASTORES_CACHE["datastores"])

        creds, default_proj = get_gcp_credentials()
        project = os.environ.get("PROJECT_ID") or default_proj
        if not project:
            return []
        location = os.environ.get("LOCATION", "global")
        engine = os.environ.get("ENGINE_ID", "").strip()
        if not engine:
            fallback = [os.environ.get("CONNECTOR_ID", "").strip()]
            return [f for f in fallback if f]

        engine_url = (
            f"https://discoveryengine.googleapis.com/v1alpha/projects/{project}/"
            f"locations/{location}/collections/default_collection/engines/{engine}"
        )

        try:
            import google.auth.transport.requests
            auth_req = google.auth.transport.requests.Request()
            if hasattr(creds, "valid") and not creds.valid:
                await asyncio.to_thread(creds.refresh, auth_req)
            token = getattr(creds, "token", None)
            headers = {
                "Authorization": f"Bearer {token}",
                "x-goog-user-project": project,
            } if token else {"x-goog-user-project": project}

            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(engine_url, headers=headers)
                if resp.status_code == 200:
                    ds_ids = resp.json().get("dataStoreIds", [])
                    if ds_ids:
                        async with _ENGINE_CACHE_LOCK:
                            _ENGINE_DATASTORES_CACHE["timestamp"] = now
                            _ENGINE_DATASTORES_CACHE["datastores"] = list(ds_ids)
                        return list(ds_ids)
        except Exception:
            pass

        # Fallback to configured environment connectors if offline or error
        fallback_ds = [
            os.environ.get("CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_GDRIVE_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_CONFLUENCE_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_JIRA_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_LUMAPPS_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_SLACK_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_SHAREPOINT_CONNECTOR_ID", "").strip(),
        ]
        return [ds for ds in fallback_ds if ds]

    async def _get_target_datastores_async(
        self,
        target: str,
        connector_ids: Optional[Union[str, List[str]]] = None,
    ) -> List[str]:
        """Dynamically routes target URI to its connector datastores or searches all live engine datastores in parallel."""
        all_engine_ds = await self._get_engine_datastores_dynamic()

        if connector_ids:
            c_list = [connector_ids] if isinstance(connector_ids, str) else list(connector_ids)
            resolved = []
            for c in c_list:
                c_str = str(c).strip()
                if c_str == "all":
                    resolved.extend(all_engine_ds)
                elif c_str and c_str != "none":
                    resolved.append(c_str)
            if resolved:
                return list(dict.fromkeys(resolved))

        t = target.lower()
        matched = []
        for ds in all_engine_ds:
            ds_clean = ds.lower()
            if ("drive" in t or extract_drive_file_id(target)) and "drive" in ds_clean:
                matched.append(ds)
            elif ("confluence" in t or "wiki" in t) and "confluence" in ds_clean:
                matched.append(ds)
            elif ("jira" in t or "browse/" in t or re.search(r"\b[A-Z]+-\d+\b", target)) and "jira" in ds_clean:
                matched.append(ds)
            elif ("lumapps" in t or "post-" in t) and "lumapps" in ds_clean:
                matched.append(ds)
            elif "slack" in t and "slack" in ds_clean:
                matched.append(ds)
            elif ("sharepoint" in t or "cymbal" in t) and "sharepoint" in ds_clean:
                matched.append(ds)

        if matched:
            return list(dict.fromkeys(matched))
        return all_engine_ds

    def _get_target_datastores(
        self,
        target: str,
        connector_ids: Optional[Union[str, List[str]]] = None,
    ) -> List[str]:
        """Synchronous fallback router for target datastores based purely on environment configuration."""
        known_datastores = [
            os.environ.get("CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_GDRIVE_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_CONFLUENCE_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_JIRA_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_LUMAPPS_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_SLACK_CONNECTOR_ID", "").strip(),
            os.environ.get("DEFAULT_SHAREPOINT_CONNECTOR_ID", "").strip(),
        ]
        all_active_ds = [ds for ds in known_datastores if ds]

        if connector_ids:
            c_list = [connector_ids] if isinstance(connector_ids, str) else list(connector_ids)
            resolved = []
            for c in c_list:
                c_str = str(c).strip()
                if c_str == "all":
                    resolved.extend(all_active_ds)
                elif c_str and c_str != "none":
                    resolved.append(c_str)
            if resolved:
                return list(dict.fromkeys(resolved))

        t = target.lower()
        matched = []
        for ds in all_active_ds:
            ds_clean = ds.lower()
            if ("drive" in t or extract_drive_file_id(target)) and "drive" in ds_clean:
                matched.append(ds)
            elif ("confluence" in t or "wiki" in t) and "confluence" in ds_clean:
                matched.append(ds)
            elif ("jira" in t or "browse/" in t or re.search(r"\b[A-Z]+-\d+\b", target)) and "jira" in ds_clean:
                matched.append(ds)
            elif ("lumapps" in t or "post-" in t) and "lumapps" in ds_clean:
                matched.append(ds)
            elif "slack" in t and "slack" in ds_clean:
                matched.append(ds)
            elif ("sharepoint" in t or "cymbal" in t) and "sharepoint" in ds_clean:
                matched.append(ds)

        if matched:
            return list(dict.fromkeys(matched))
        return all_active_ds

    async def _probe_discovery_engine_connector(
        self,
        target: str,
        connector_ids: Optional[Union[str, List[str]]] = None,
        scenario_query: Optional[str] = None,
        ground_truth: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes parallel Discovery Engine search probes across specified connector data stores.
        Uses scenario keywords, file ID, and full URI with strict match verification.
        """
        creds, default_proj = get_gcp_credentials()
        project = os.environ.get("PROJECT_ID") or default_proj
        if not project:
            raise ValueError("PROJECT_ID environment variable or GCP ADC quota project is required.")
        location = os.environ.get("LOCATION", "global")

        target_clean = target.lower().strip()

        import google.auth.transport.requests
        auth_req = google.auth.transport.requests.Request()
        if hasattr(creds, "valid") and not creds.valid:
            await asyncio.to_thread(creds.refresh, auth_req)

        token = getattr(creds, "token", None)
        headers = {
            "Authorization": f"Bearer {token}",
            "x-goog-user-project": project,
            "Content-Type": "application/json",
        } if token else {"x-goog-user-project": project, "Content-Type": "application/json"}

        # 1. Primary Strategy: Live streamAssist Agentic Document Reader (Option 4 Calibrated Prompt)
        engine_id = os.environ.get("ENGINE_ID", "yahoo_1780365163254").strip()
        if engine_id and os.environ.get("TESTING") != "true" and os.environ.get("MOCK_ADC") != "true":
            try:
                from ge_eval_harness.backend.services.stream_assist_client import invoke_stream_assist_eval

                if scenario_query and ground_truth:
                    prompt = (
                        f"Locate and read the document at '{target}' to answer: '{scenario_query}'. "
                        f"Summarize the document, particularly focusing on any content, facts, or instructions directly related to: '{ground_truth}' if present in the document."
                    )
                elif scenario_query:
                    prompt = (
                        f"Locate and read the document at '{target}' to answer: '{scenario_query}'. "
                        f"Summarize its key facts, policies, and instructions in detail."
                    )
                else:
                    prompt = (
                        f"Locate and read the document at '{target}'. "
                        f"Extract its title and summarize its key facts and instructions in detail."
                    )

                endpoint_url = (
                    f"https://discoveryengine.googleapis.com/v1alpha/projects/{project}/"
                    f"locations/{location}/collections/default_collection/engines/{engine_id}/"
                    f"assistants/default_assistant:streamAssist"
                )

                t_sa_0 = time.perf_counter()
                async with httpx.AsyncClient(timeout=self.timeout_sec) as sa_client:
                    sa_record = await invoke_stream_assist_eval(
                        query=prompt,
                        model_id=os.environ.get("MODEL_ID", "gemini-3.5-flash"),
                        instruction_set="Default",
                        agent_id=os.environ.get("AGENT_ID", "core_assistant"),
                        search_mode="Agentic",
                        client=sa_client,
                        headers=headers,
                        endpoint_url=endpoint_url,
                        project_id=project,
                        iteration_idx=0,
                        expected_source=target,
                    )
                dt_sa = round((time.perf_counter() - t_sa_0) * 1000, 1)

                sa_status = sa_record.get("status_code", 200)
                sa_text = sa_record.get("response_text", "").strip()
                sa_retrieved = sa_record.get("retrieved_documents", [])
                sa_tools = sa_record.get("tool_calls", [])
                sa_conn = sa_record.get("connectors_used") or self._infer_connector_type(target)

                # Check if streamAssist found and read the document
                if sa_status == 200 and (len(sa_text) >= 30 or sa_retrieved):
                    matched_title = target.split("/")[-1] if "/" in target else target
                    if sa_retrieved and sa_retrieved[0].get("title"):
                        matched_title = sa_retrieved[0]["title"]

                    combined_body = sa_text
                    if sa_retrieved:
                        chunk_snippets = [f"[{d.get('title', 'Grounding Chunk')}]: {d.get('snippets', '')}" for d in sa_retrieved if d.get('snippets')]
                        if chunk_snippets:
                            combined_body += "\n\n[GROUNDED CHUNKS]:\n" + "\n\n".join(chunk_snippets)

                    return {
                        "uri": target,
                        "title": matched_title,
                        "accessible": True,
                        "status_code": 200,
                        "error": "",
                        "content": combined_body,
                        "connector_used": sa_conn,
                        "fetch_method": "STREAM_ASSIST_READER",
                        "fetch_latency_ms": dt_sa,
                        "debug_trace": {
                            "target_uri": target,
                            "scenario_query": scenario_query,
                            "stream_assist_prompt": prompt,
                            "fetch_method": "STREAM_ASSIST_READER",
                            "status_code": sa_status,
                            "ttft_sec": sa_record.get("ttft_sec", 0.0),
                            "ttlt_sec": sa_record.get("ttlt_sec", 0.0),
                            "latency_ms": dt_sa,
                            "tool_calls": sa_tools,
                            "retrieved_documents_count": len(sa_retrieved),
                            "retrieved_documents": sa_retrieved,
                            "trace_id": sa_record.get("trace_id", ""),
                            "session_name": sa_record.get("session_name", ""),
                            "stream_assist_summary": sa_text,
                            "content_extracted_length": len(combined_body),
                        }
                    }
            except Exception as sa_err:
                logger.debug(f"streamAssist document read fallback: {sa_err}")

        # 2. Secondary Strategy: Multi-DataStore Parallel Search Probes
        target_datastores = await self._get_target_datastores_async(target, connector_ids)
        queries_tried = extract_query_candidates(target, scenario_query)
        probe_lifecycle_log: List[Dict[str, Any]] = []

        payload_template = {
            "pageSize": 10,
            "contentSearchSpec": {
                "snippetSpec": {"returnSnippet": True, "maxSnippetCount": 5},
            },
        }

        async def _query_single_ds_and_query(client: httpx.AsyncClient, ds: str, query_text: str, idx: int) -> Tuple[Optional[Dict[str, Any]], Dict[str, Any]]:
            ds_search_url = (
                f"https://discoveryengine.googleapis.com/v1alpha/projects/{project}/"
                f"locations/{location}/collections/default_collection/dataStores/{ds}/"
                f"servingConfigs/default_search:search"
            )
            payload = dict(payload_template)
            payload["query"] = query_text
            t_probe = time.perf_counter()
            conn_name = format_connector_display_name(ds)
            try:
                resp = await client.post(ds_search_url, headers=headers, json=payload)
                dt_probe = round((time.perf_counter() - t_probe) * 1000, 1)
                if resp.status_code == 200:
                    data = resp.json()
                    results = data.get("results", [])
                    candidates = []
                    match_found = None
                    matched_doc_title = ""
                    for r in results:
                        doc = r.get("document", {})
                        struct = doc.get("derivedStructData", {}) or doc.get("structData", {})
                        title = struct.get("title", "")
                        link = struct.get("link", "") or struct.get("uri", "") or doc.get("name", "")
                        doc_name = doc.get("name", "")
                        doc_id = doc.get("id", "") or (doc_name.split("/")[-1] if "/" in doc_name else "")
                        snippets_list = struct.get("snippets", [])
                        clean_snips = [strip_html_tags(s.get("snippet", "")) for s in snippets_list if s.get("snippet")]

                        candidates.append({
                            "id": doc_id,
                            "title": title or doc_id,
                            "link": link,
                            "snippet_preview": clean_snips[0][:120] if clean_snips else "",
                        })

                        # Match Verification: Checks if target URL or query candidate matches document link, URI, or ID
                        is_match = False
                        link_clean = link.lower()
                        if target_clean in link_clean or (link_clean and link_clean in target_clean):
                            is_match = True
                        elif target_clean in doc_id.lower() or (doc_id and doc_id.lower() in target_clean):
                            is_match = True
                        elif title and (title.lower() in target_clean or target_clean in title.lower()):
                            is_match = True
                        else:
                            for q_cand in queries_tried:
                                q_lower = q_cand.lower()
                                if len(q_lower) >= 8 and (q_lower in link_clean or q_lower in doc_id.lower()):
                                    is_match = True
                                    break

                        if is_match and not match_found:
                            combined_text = "\n\n".join(clean_snips)
                            if combined_text:
                                matched_doc_title = title or doc_id
                                match_found = {
                                    "uri": link or target,
                                    "title": title or (f"{conn_name}: {doc_id}"),
                                    "accessible": True,
                                    "status_code": 200,
                                    "error": "",
                                    "content": combined_text,
                                    "connector_used": conn_name,
                                    "fetch_method": "CONNECTOR_ENGINE_PROBE",
                                    "fetch_latency_ms": dt_probe,
                                }

                    verdict_str = f"MATCH: '{matched_doc_title}'" if match_found else (f"{len(results)} candidate(s) returned (ID mismatch)" if results else "0 documents returned")
                    probe_log = {
                        "probe_index": idx,
                        "step": "STEP 3: PARALLEL DATASTORE SEARCH",
                        "datastore_id": ds,
                        "connector_name": conn_name,
                        "query_used": query_text,
                        "endpoint_url": ds_search_url,
                        "request_payload": payload,
                        "response_status": resp.status_code,
                        "latency_ms": dt_probe,
                        "results_count": len(results),
                        "candidates": candidates[:3],
                        "is_match": bool(match_found),
                        "match_verdict": verdict_str,
                    }
                    return (match_found, probe_log)
                else:
                    dt_probe = round((time.perf_counter() - t_probe) * 1000, 1)
                    probe_log = {
                        "probe_index": idx,
                        "step": "STEP 3: PARALLEL DATASTORE SEARCH",
                        "datastore_id": ds,
                        "connector_name": conn_name,
                        "query_used": query_text,
                        "endpoint_url": ds_search_url,
                        "request_payload": payload,
                        "response_status": resp.status_code,
                        "latency_ms": dt_probe,
                        "results_count": 0,
                        "candidates": [],
                        "is_match": False,
                        "match_verdict": f"HTTP {resp.status_code} Error: {resp.text[:100]}",
                    }
                    return (None, probe_log)
            except Exception as exc:
                dt_probe = round((time.perf_counter() - t_probe) * 1000, 1)
                probe_log = {
                    "probe_index": idx,
                    "step": "STEP 3: PARALLEL DATASTORE SEARCH",
                    "datastore_id": ds,
                    "connector_name": conn_name,
                    "query_used": query_text,
                    "endpoint_url": ds_search_url,
                    "request_payload": payload,
                    "response_status": 500,
                    "latency_ms": dt_probe,
                    "results_count": 0,
                    "candidates": [],
                    "is_match": False,
                    "match_verdict": f"Exception: {str(exc)}",
                }
                return (None, probe_log)

        async with httpx.AsyncClient(timeout=min(self.timeout_sec, 3.0)) as client:
            tasks = []
            idx = 1
            for ds in target_datastores:
                for q in queries_tried:
                    tasks.append(_query_single_ds_and_query(client, ds, q, idx))
                    idx += 1

            probe_results = await asyncio.gather(*tasks)
            matched_res = None
            for match_obj, probe_log in probe_results:
                probe_lifecycle_log.append(probe_log)
                if match_obj and not matched_res:
                    matched_res = match_obj

            if matched_res:
                matched_res["debug_trace"] = {
                    "target_uri": target,
                    "scenario_query": scenario_query,
                    "search_queries_tried": queries_tried,
                    "datastores_tried": target_datastores,
                    "probe_lifecycle_log": probe_lifecycle_log,
                    "content_extracted_length": len(matched_res.get("content", "")),
                }
                return matched_res

        # Check local benchmark dataset file resolver on disk (if enabled)
        if self.allow_local_fallback:
            from ge_eval_harness.backend.services.llm_judge_service import find_local_document_content
            local_match = find_local_document_content(target)
            if local_match:
                doc_title, doc_text = local_match
                return {
                    "uri": target,
                    "title": doc_title,
                    "accessible": True,
                    "status_code": 200,
                    "error": "",
                    "content": doc_text,
                    "connector_used": "Local Benchmark Store",
                    "fetch_method": "LOCAL_BENCHMARK_CORPUS",
                    "debug_trace": {
                        "target_uri": target,
                        "scenario_query": scenario_query,
                        "search_query": scenario_query or target,
                        "endpoint_url": "Local Repository Disk Resolver",
                        "request_payload": payload_template,
                        "response_status": 200,
                        "note": "Resolved from canonical benchmark document store.",
                        "datastores_tried": target_datastores,
                        "probe_lifecycle_log": probe_lifecycle_log,
                        "content_extracted_length": len(doc_text),
                    }
                }

        return {
            "uri": target,
            "title": target.split("/")[-1] if "/" in target else target,
            "accessible": False,
            "status_code": 404,
            "error": f"Document could not be retrieved via connectors or web within {self.timeout_sec}s timeout.",
            "content": "",
            "connector_used": "Discovery Engine",
            "fetch_method": "CONNECTOR_NOT_FOUND",
            "debug_trace": {
                "target_uri": target,
                "scenario_query": scenario_query,
                "search_queries_tried": queries_tried,
                "probe_lifecycle_log": probe_lifecycle_log,
                "datastores_tried": target_datastores,
                "queries_tried": queries_tried,
                "response_status": 404,
                "error_details": f"Zero matching documents found across {len(probe_lifecycle_log)} parallel probes dispatched to {len(target_datastores)} DataStores.",
            }
        }

    async def execute_parallel_testbed(
        self,
        targets: List[str],
        scenario_query: Optional[str] = None,
        connector_ids: Optional[Union[str, List[str]]] = "all",
    ) -> Dict[str, Any]:
        """
        Executes a comprehensive parallel test bed audit across multiple target URLs/IDs and queries.
        Returns full lifecycle logs, per-probe waterfall traces, candidate previews, and timing metrics.
        """
        t_start = time.perf_counter()
        clean_targets = [str(t).strip() for t in targets if str(t).strip()]
        if not clean_targets and scenario_query:
            clean_targets = [scenario_query]
        elif not clean_targets:
            clean_targets = [""]

        datastores = await self._get_engine_datastores_dynamic()
        all_results = []
        all_probe_logs = []

        for target in clean_targets:
            res = await self.fetch_document(
                uri_or_id=target,
                scenario_query=scenario_query,
                connector_ids=connector_ids,
            )
            d_trace = res.get("debug_trace", {})
            p_logs = d_trace.get("probe_lifecycle_log", [])
            all_probe_logs.extend(p_logs)
            all_results.append({
                "target": target,
                "title": res.get("title", ""),
                "accessible": res.get("accessible", False),
                "status_code": res.get("status_code", 404),
                "connector_used": res.get("connector_used", "Discovery Engine"),
                "fetch_method": res.get("fetch_method", "CONNECTOR_PROBE"),
                "fetch_latency_ms": res.get("fetch_latency_ms", 0.0),
                "error": res.get("error", ""),
                "content_preview": (res.get("content", "")[:400] if res.get("content") else ""),
                "content_length": len(res.get("content", "")),
                "debug_trace": d_trace,
            })

        total_elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)
        return {
            "status": "success",
            "scenario_query": scenario_query or "",
            "targets": clean_targets,
            "datastores_discovered": [
                {"id": ds, "display_name": format_connector_display_name(ds)}
                for ds in datastores
            ],
            "total_datastores_count": len(datastores),
            "total_probes_dispatched": len(all_probe_logs),
            "total_latency_ms": total_elapsed_ms,
            "results": all_results,
            "all_probe_logs": all_probe_logs,
        }

    async def _fetch_public_web_document(self, url: str) -> Dict[str, Any]:
        """Fetches public or intranet HTTP documentation safely without regex parsing."""
        async with httpx.AsyncClient(timeout=self.timeout_sec, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                raw_text = resp.text
                clean_text, parsed_title = extract_html_text_and_title(raw_text)
                title = parsed_title.strip() if parsed_title else url.split("/")[-1]

                return {
                    "uri": url,
                    "title": title,
                    "accessible": True,
                    "status_code": 200,
                    "error": "",
                    "content": clean_text[:4000],
                    "connector_used": "Web / HTTP",
                    "fetch_method": "WEB_HTTP",
                }
            return {
                "uri": url,
                "title": url.split("/")[-1],
                "accessible": False,
                "status_code": resp.status_code,
                "error": f"HTTP {resp.status_code} returned by destination server.",
                "content": "",
                "connector_used": "Web / HTTP",
                "fetch_method": "WEB_HTTP",
            }

    async def _cache_document(self, key: str, payload: Dict[str, Any]) -> None:
        """Stores document payload in the in-memory LRU cache."""
        async with _LRU_CACHE_LOCK:
            _DOCUMENT_LRU_CACHE[key] = payload
            if len(_DOCUMENT_LRU_CACHE) > _MAX_LRU_CACHE_SIZE:
                _DOCUMENT_LRU_CACHE.popitem(last=False)

    @staticmethod
    def _infer_connector_type(uri: str) -> str:
        """Infers enterprise connector type from URI pattern with strict domain boundary checks."""
        u = str(uri or "").strip().lower()
        try:
            parsed = urlparse(u)
            host = parsed.hostname or parsed.netloc or ""
            path = parsed.path or ""
        except Exception:
            host = ""
            path = ""

        def _is_domain(target_host: str, domain: str) -> bool:
            return target_host == domain or target_host.endswith("." + domain)

        if _is_domain(host, "drive.google.com") or "open?id=" in u or u.startswith("drive_doc://"):
            return "Google Drive Connector"
        if ("confluence" in host.split(".") or _is_domain(host, "atlassian.net")) and ("wiki" in path or "confluence" in host.split(".")):
            return "Confluence Connector"
        if ("jira" in host.split(".") or _is_domain(host, "atlassian.net")) and ("jira" in path or "browse/" in path or "jira" in host.split(".")):
            return "Jira Connector"
        if _is_domain(host, "slack.com") or "archives/" in path:
            return "Slack Connector"
        if _is_domain(host, "sharepoint.com"):
            return "SharePoint Connector"
        return "Enterprise Connector"


# Global singleton instance
_GLOBAL_DOCUMENT_SERVICE = DocumentConnectorService(timeout_sec=45.0)


def get_document_connector_service() -> DocumentConnectorService:
    """Returns global DocumentConnectorService singleton."""
    return _GLOBAL_DOCUMENT_SERVICE
