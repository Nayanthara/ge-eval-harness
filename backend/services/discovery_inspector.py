#!/usr/bin/env python3
"""
Automated Discovery Engine Collection Inspector & W3C OpenTelemetry Grounding Trace Generator.
"""

import json
import os
import secrets
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from ge_eval_harness.config import bootstrap_environment
bootstrap_environment()


def export_trace_to_gcp_cloud_trace(trace_id: str, span_id: str, span_name_display: str = "Eval Harness Request"):
    project_id = os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", ""))
    url = f"https://cloudtrace.googleapis.com/v2/projects/{project_id}/traces:batchWrite"
    headers = {"x-goog-user-project": project_id}
    try:
        import datetime
        import google.auth
        import google.auth.transport.requests

        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        auth_req = google.auth.transport.requests.Request()
        credentials.refresh(auth_req)
        headers["Authorization"] = f"Bearer {credentials.token}"

        now = datetime.datetime.now(datetime.timezone.utc)
        start_time = now.isoformat()
        end_time = (now + datetime.timedelta(milliseconds=120)).isoformat()
        span_name = f"projects/{project_id}/traces/{trace_id}/spans/{span_id}"

        payload = {
            "spans": [
                {
                    "name": span_name,
                    "spanId": span_id,
                    "displayName": {"value": span_name_display},
                    "startTime": start_time,
                    "endTime": end_time,
                }
            ]
        }
        with httpx.Client(timeout=5.0) as client:
            client.post(url, json=payload, headers=headers)
    except Exception:
        pass


def export_detailed_evaluation_trace(record: Dict[str, Any]):
    project_id = os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", ""))
    trace_id = record.get("trace_id") or secrets.token_hex(16)
    root_span_id = record.get("span_id") or secrets.token_hex(8)

    url = f"https://cloudtrace.googleapis.com/v2/projects/{project_id}/traces:batchWrite"
    headers = {"x-goog-user-project": project_id}
    try:
        import datetime
        import google.auth
        import google.auth.transport.requests

        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        auth_req = google.auth.transport.requests.Request()
        credentials.refresh(auth_req)
        headers["Authorization"] = f"Bearer {credentials.token}"

        now = datetime.datetime.now(datetime.timezone.utc)
        ttlt = float(record.get("ttlt_sec", 1.2))
        ttft = float(record.get("ttft_sec", 0.3))

        t0 = now
        t1 = t0 + datetime.timedelta(seconds=ttft)
        t2 = t0 + datetime.timedelta(seconds=ttlt)
        t3 = t2 + datetime.timedelta(milliseconds=150)
        t4 = t3 + datetime.timedelta(milliseconds=800)

        span_stream_id = secrets.token_hex(8)
        span_citation_id = secrets.token_hex(8)
        span_judge_id = secrets.token_hex(8)

        def make_attributes(attr_dict):
            res = {}
            for k, v in attr_dict.items():
                res[k] = {"stringValue": {"value": str(v)}}
            return res

        query_label = record.get("query", "Benchmark")[:35]
        spans = [
            {
                "name": f"projects/{project_id}/traces/{trace_id}/spans/{root_span_id}",
                "spanId": root_span_id,
                "displayName": {"value": f"Eval Harness: {query_label}"},
                "startTime": t0.isoformat(),
                "endTime": t4.isoformat(),
                "attributes": {"attributeMap": make_attributes({
                    "eval.query": record.get("query", ""),
                    "eval.ground_truth": record.get("ground_truth", ""),
                    "eval.system": record.get("system", "Gemini_Enterprise"),
                    "eval.model_id": record.get("model_id", "gemini-3.5-flash"),
                    "eval.instruction_set": record.get("instruction_set", "Default"),
                    "eval.judge_pass": record.get("judge_pass", False),
                })}
            },
            {
                "name": f"projects/{project_id}/traces/{trace_id}/spans/{span_stream_id}",
                "spanId": span_stream_id,
                "parentSpanId": root_span_id,
                "displayName": {
                    "value": "Discovery Engine: Vector Search API (:search)"
                    if record.get("search_mode") == "Vector"
                    else "Discovery Engine: streamAssist REST API"
                },
                "startTime": t0.isoformat(),
                "endTime": t2.isoformat(),
                "attributes": {"attributeMap": make_attributes({
                    "http.url": "https://discoveryengine.googleapis.com/v1alpha/...:search" if record.get("search_mode") == "Vector" else "https://discoveryengine.googleapis.com/v1alpha/...:streamAssist",
                    "http.status_code": record.get("status_code", 200),
                    "discovery_engine.ttft_sec": record.get("ttft_sec", 0.0),
                    "discovery_engine.ttlt_sec": record.get("ttlt_sec", 0.0),
                    "discovery_engine.tps": record.get("generation_speed_tps", 0.0),
                    "discovery_engine.word_count": record.get("response_word_count", 0),
                    "discovery_engine.connectors": record.get("connectors_used", ""),
                })}
            },
            {
                "name": f"projects/{project_id}/traces/{trace_id}/spans/{span_citation_id}",
                "spanId": span_citation_id,
                "parentSpanId": root_span_id,
                "displayName": {"value": "Eval Harness: Citation Extraction & Attribution"},
                "startTime": t2.isoformat(),
                "endTime": t3.isoformat(),
                "attributes": {"attributeMap": make_attributes({
                    "citation.has_required_source": record.get("has_required_source", False),
                    "citation.total_sources_count": record.get("total_sources_count", 0),
                    "citation.source_urls": record.get("source_urls", ""),
                })}
            },
            {
                "name": f"projects/{project_id}/traces/{trace_id}/spans/{span_judge_id}",
                "spanId": span_judge_id,
                "parentSpanId": root_span_id,
                "displayName": {"value": "Vertex AI: Gemini 3.1 Pro LLM-as-a-Judge"},
                "startTime": t3.isoformat(),
                "endTime": t4.isoformat(),
                "attributes": {"attributeMap": make_attributes({
                    "judge.model": "gemini-3.1-pro-preview",
                    "judge.pass": record.get("judge_pass", False),
                    "judge.confidence": record.get("judge_confidence", 0.0),
                    "judge.reasoning": record.get("judge_reasoning", "")[:200],
                })}
            },
        ]

        payload = {"spans": spans}
        with httpx.Client(timeout=5.0) as client:
            client.post(url, json=payload, headers=headers)
    except Exception:
        pass


def generate_w3c_traceparent() -> Dict[str, str]:
    trace_id = secrets.token_hex(16)
    span_id = secrets.token_hex(8)
    traceparent = f"00-{trace_id}-{span_id}-01"

    return {
        "traceparent": traceparent,
        "trace_id": trace_id,
        "span_id": span_id,
    }


def inspect_collections(
    project_id: Optional[str] = None,
    location: Optional[str] = None,
    mock: bool = False,
) -> List[Dict[str, Any]]:
    project_id = project_id or os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", ""))
    location = location or os.getenv("LOCATION", os.getenv("GCP_LOCATION", "global"))
    app_id = os.getenv("APP_ID", os.getenv("ENGINE_ID", ""))
    app_name = os.getenv("APP_NAME", "Yahoo Gemini Enterprise")

    if mock:
        default_gdrive = os.getenv(
            "DEFAULT_GDRIVE_CONNECTOR_ID",
            os.getenv("CONNECTOR_ID", "gdrive-connector_1782848677730_google_drive"),
        )
        return [
            {
                "collection_id": "default_collection",
                "display_name": f"{app_name} Default Collection",
                "engine_id": app_id,
                "location": location,
                "project_id": project_id,
                "connectors": [
                    {
                        "connector_id": default_gdrive,
                        "display_name": "Google Drive (Corp Knowledge Base)",
                        "type": "GOOGLE_DRIVE",
                        "status": "ACTIVE",
                    },
                    {
                        "connector_id": "jira-connector",
                        "display_name": "Jira Cloud (Engineering Issues)",
                        "type": "JIRA",
                        "status": "ACTIVE",
                    },
                    {
                        "connector_id": "confluence-connector",
                        "display_name": "Confluence (Product Specs)",
                        "type": "CONFLUENCE",
                        "status": "ACTIVE",
                    },
                ],
            }
        ]

    engine_url = f"https://discoveryengine.googleapis.com/v1alpha/projects/{project_id}/locations/{location}/collections/default_collection/engines/{app_id}"
    headers = {"x-goog-user-project": project_id}
    try:
        import google.auth
        import google.auth.transport.requests

        credentials, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        auth_req = google.auth.transport.requests.Request()
        credentials.refresh(auth_req)
        headers["Authorization"] = f"Bearer {credentials.token}"
    except Exception:
        return inspect_collections(project_id=project_id, location=location, mock=True)

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.get(engine_url, headers=headers)
            if resp.status_code == 200:
                engine_data = resp.json()
                data_store_ids = engine_data.get("dataStoreIds", [])
                active_connectors = []
                for ds_id in data_store_ids:
                    active_connectors.append({
                        "connector_id": ds_id,
                        "display_name": ds_id,
                        "type": "ATTACHED_DATASTORE",
                        "status": "ACTIVE",
                    })

                if active_connectors:
                    return [
                        {
                            "collection_id": "default_collection",
                            "display_name": f"{app_name} App Collection ({app_id})",
                            "engine_id": app_id,
                            "location": location,
                            "project_id": project_id,
                            "connectors": active_connectors,
                        }
                    ]
    except Exception:
        pass

    return inspect_collections(project_id=project_id, location=location, mock=True)


inspect_discovery_engine_collections = inspect_collections


class DiscoveryInspector:
    def __init__(
        self,
        project_id: Optional[str] = None,
        location: Optional[str] = None,
    ):
        self.project_id = project_id or os.getenv("PROJECT_ID", "")
        self.location = location or os.getenv("LOCATION", "global")

    def create_trace_context(self, span_name: str = "eval-studio-request") -> Dict[str, str]:
        return generate_w3c_traceparent()

    def list_collections(self, mock: bool = False) -> List[Dict[str, Any]]:
        return inspect_collections(
            project_id=self.project_id,
            location=self.location,
            mock=mock,
        )


if __name__ == "__main__":
    results = inspect_collections()
    print(json.dumps(results, indent=2))

