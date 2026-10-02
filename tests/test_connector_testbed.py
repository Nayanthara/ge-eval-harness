"""
Unit tests for Parallel Connector Test Bed Service, API Endpoints, and CLI.
"""

import os
os.environ["TESTING"] = "true"

import pytest
import asyncio
from fastapi.testclient import TestClient

from ge_eval_harness.backend.app import app
from ge_eval_harness.backend.services.document_connector_service import (
    DocumentConnectorService,
    get_document_connector_service,
)

@pytest.mark.asyncio
async def test_execute_parallel_testbed_service(monkeypatch):
    """Verify that execute_parallel_testbed dispatches probes and formats full results structure."""
    service = DocumentConnectorService(timeout_sec=2.0)

    # Mock dynamic datastores
    async def mock_get_ds():
        return ["mock-gdrive-ds", "mock-jira-ds"]

    monkeypatch.setattr(service, "_get_engine_datastores_dynamic", mock_get_ds)

    # Mock probe
    async def mock_probe(target, connector_ids=None, scenario_query=None, ground_truth=None, **kwargs):
        return {
            "uri": target,
            "title": f"Mock Title: {target}",
            "accessible": True,
            "status_code": 200,
            "error": "",
            "content": "Mock document content for testbed.",
            "connector_used": "Mock Connector",
            "fetch_method": "CONNECTOR_PROBE",
            "fetch_latency_ms": 12.5,
            "debug_trace": {
                "probe_lifecycle_log": [
                    {
                        "probe_index": 1,
                        "datastore_id": "mock-gdrive-ds",
                        "connector_name": "Google Drive Connector",
                        "query_used": target,
                        "response_status": 200,
                        "latency_ms": 10.0,
                        "results_count": 1,
                        "is_match": True,
                        "match_verdict": "MATCH: 'Mock Title'",
                    }
                ]
            }
        }
    monkeypatch.setattr(service, "_probe_discovery_engine_connector", mock_probe)

    res = await service.execute_parallel_testbed(
        targets=["https://drive.google.com/open?id=test_file_123"],
        scenario_query="test query",
        connector_ids="all",
    )

    assert res["status"] == "success"
    assert res["total_datastores_count"] == 2
    assert len(res["results"]) == 1
    assert res["results"][0]["accessible"] is True
    assert res["results"][0]["connector_used"] == "Mock Connector"
    assert len(res["all_probe_logs"]) == 1


def test_testbed_api_endpoints(monkeypatch):
    """Verify GET /api/testbed/datastores and POST /api/testbed/probe endpoints."""
    client = TestClient(app)

    # 1. Test GET /api/testbed/datastores
    async def mock_datastores():
        return ["mock-gdrive-ds", "mock-confluence-ds"]

    doc_service = get_document_connector_service()
    monkeypatch.setattr(doc_service, "_get_engine_datastores_dynamic", mock_datastores)

    resp_ds = client.get("/api/testbed/datastores")
    assert resp_ds.status_code == 200
    data_ds = resp_ds.json()
    assert data_ds["status"] == "success"
    assert data_ds["count"] == 2

    # 2. Test POST /api/testbed/probe
    async def mock_execute_testbed(self, targets, scenario_query=None, connector_ids="all"):
        return {
            "status": "success",
            "scenario_query": scenario_query or "",
            "targets": targets,
            "total_datastores_count": 2,
            "total_probes_dispatched": 4,
            "total_latency_ms": 45.2,
            "results": [
                {
                    "target": targets[0] if targets else "",
                    "title": "Mock Target Result",
                    "accessible": True,
                    "status_code": 200,
                    "connector_used": "Google Drive Connector",
                    "fetch_method": "CONNECTOR_PROBE",
                    "fetch_latency_ms": 45.2,
                    "error": "",
                    "content_preview": "Extracted content preview",
                    "content_length": 25,
                }
            ],
            "all_probe_logs": [
                {
                    "probe_index": 1,
                    "datastore_id": "mock-gdrive-ds",
                    "connector_name": "Google Drive Connector",
                    "query_used": "test_id_123",
                    "response_status": 200,
                    "latency_ms": 22.0,
                    "results_count": 1,
                    "is_match": True,
                    "match_verdict": "MATCH",
                }
            ]
        }
    monkeypatch.setattr(DocumentConnectorService, "execute_parallel_testbed", mock_execute_testbed)

    resp_probe = client.post("/api/testbed/probe", json={
        "targets": "test_id_123\nhttps://drive.google.com/open?id=abc",
        "scenario_query": "how do I run tests?",
        "connector_ids": "all"
    })
    assert resp_probe.status_code == 200
    data_probe = resp_probe.json()
    assert data_probe["status"] == "success"
    assert data_probe["total_probes_dispatched"] == 4
    assert len(data_probe["results"]) == 1
    assert data_probe["results"][0]["accessible"] is True


def test_cli_probe_testbed_module_import():
    """Verify probe_testbed CLI entrypoint compiles and imports cleanly."""
    import ge_eval_harness.cli.probe_testbed as cli_mod
    assert hasattr(cli_mod, "main")
    assert hasattr(cli_mod, "main_async")


@pytest.mark.asyncio
async def test_execute_stream_assist_testbed_service(monkeypatch):
    """Verify that execute_stream_assist_testbed dispatches parallel agent calls."""
    import ge_eval_harness.backend.services.stream_assist_client as sa_mod

    async def mock_stream_call(*args, **kwargs):
        target = kwargs.get("expected_source", "")
        return {
            "query": kwargs.get("query", ""),
            "response_text": f"Extracted content from {target} via streamAssist.",
            "status_code": 200,
            "ttft_sec": 0.32,
            "ttlt_sec": 0.85,
            "connectors_used": "Google Drive Connector",
            "tool_calls": [{"name": "gdrive_connector_action"}],
            "retrieved_documents": [
                {
                    "title": "Python Standards in Enterprise",
                    "uri": target,
                    "id": "1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO",
                    "snippets": "Use uv/venv and ruff."
                }
            ],
            "source_urls": target,
            "trace_id": "test_trace_123",
            "span_id": "test_span_456",
            "assist_token": "token_abc",
            "raw_chunks": [{"answer": {}}],
        }

    monkeypatch.setattr(sa_mod, "invoke_stream_assist_eval", mock_stream_call)

    res = await sa_mod.execute_stream_assist_testbed(
        targets=[
            "https://drive.google.com/a/thomascummins.altostrat.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO",
            "https://enterprise.atlassian.net/jira/browse/JIRA-102"
        ],
        scenario_query="what are the python guidelines?",
        agent_id="core_assistant",
        model_id="gemini-3.5-flash",
    )

    assert res["status"] == "success"
    assert res["targets_count"] == 2
    assert len(res["results"]) == 2
    assert res["results"][0]["status_code"] == 200
    assert len(res["results"][0]["retrieved_documents"]) == 1
    assert "uv/venv" in res["results"][0]["retrieved_documents"][0]["snippets"]


def test_stream_assist_testbed_api_endpoint(monkeypatch):
    """Verify POST /api/testbed/stream-assist endpoint returns structured JSON."""
    client = TestClient(app)
    import ge_eval_harness.backend.services.stream_assist_client as sa_mod

    async def mock_stream_testbed(*args, **kwargs):
        return {
            "status": "success",
            "engine_type": "streamAssist",
            "engine_id": "enterprise_engine_1780365163254",
            "targets_count": 1,
            "total_latency_ms": 780.5,
            "results": [
                {
                    "probe_index": 1,
                    "target": "https://drive.google.com/open?id=1YYMik21vs4",
                    "query_prompt": "Read document",
                    "response_text": "Extracted document body text.",
                    "status_code": 200,
                    "ttft_sec": 0.25,
                    "ttlt_sec": 0.78,
                    "latency_ms": 780.5,
                    "connectors_used": "Google Drive",
                    "tool_calls": [{"name": "gdrive_connector_action"}],
                    "retrieved_documents": [{"title": "Doc Title", "uri": "https://drive.google.com/open?id=1YYMik21vs4"}],
                    "source_urls": "https://drive.google.com/open?id=1YYMik21vs4",
                    "is_match": True,
                    "match_verdict": "MATCH: 'Doc Title'",
                }
            ]
        }

    monkeypatch.setattr(sa_mod, "execute_stream_assist_testbed", mock_stream_testbed)

    resp = client.post("/api/testbed/stream-assist", json={
        "targets": "https://drive.google.com/open?id=1YYMik21vs4",
        "scenario_query": "Read document",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["engine_type"] == "streamAssist"
    assert len(data["results"]) == 1
    assert data["results"][0]["is_match"] is True

