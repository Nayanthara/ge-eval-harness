"""
Unit tests for Automated Discovery Engine Collection Inspector and W3C OpenTelemetry grounding traces.
"""

import re
import pytest
from ge_eval_harness.backend.services.discovery_inspector import (
    DiscoveryInspector,
    generate_w3c_traceparent,
    inspect_collections,
)


def test_generate_w3c_traceparent():
    """Verify that generate_w3c_traceparent returns valid traceparent, trace_id, and span_id."""
    trace_info = generate_w3c_traceparent()
    assert "traceparent" in trace_info
    assert "trace_id" in trace_info
    assert "span_id" in trace_info

    trace_id = trace_info["trace_id"]
    span_id = trace_info["span_id"]
    traceparent = trace_info["traceparent"]

    assert len(trace_id) == 32
    assert len(span_id) == 16
    assert re.match(r"^[0-9a-f]{32}$", trace_id), f"Invalid trace_id format: {trace_id}"
    assert re.match(r"^[0-9a-f]{16}$", span_id), f"Invalid span_id format: {span_id}"
    assert traceparent == f"00-{trace_id}-{span_id}-01"


def test_inspect_collections_mock():
    """Verify that inspect_collections returns structured collection and connector metadata."""
    collections = inspect_collections(project_id="genai-alpha-422116", location="global", mock=True)
    assert isinstance(collections, list)
    assert len(collections) > 0

    first_col = collections[0]
    assert "collection_id" in first_col
    assert "display_name" in first_col
    assert "connectors" in first_col
    assert isinstance(first_col["connectors"], list)

    connector_ids = [c["connector_id"] for c in first_col["connectors"]]
    assert "gdrive-connector_1782848677730_google_drive" in connector_ids
    assert "jira-connector" in connector_ids


def test_discovery_inspector_class():
    """Verify DiscoveryInspector class initialization and sample trace generation."""
    inspector = DiscoveryInspector(project_id="genai-alpha-422116", location="global")
    assert inspector.project_id == "genai-alpha-422116"
    assert inspector.location == "global"

    trace_data = inspector.create_trace_context(span_name="eval-studio-test")
    assert "traceparent" in trace_data
    assert "trace_id" in trace_data
    assert "span_id" in trace_data


def test_discovery_inspector_cli_entrypoint():
    """Verify that discovery_inspector.py can execute standalone without errors."""
    import subprocess
    import sys
    import os
    env = dict(os.environ)
    env["PYTHONPATH"] = ".."
    result = subprocess.run(
        [sys.executable, "-m", "ge_eval_harness.backend.services.discovery_inspector"],
        capture_output=True,
        text=True,
        env=env,
        check=True,
    )
    assert result.returncode == 0
    assert "collection_id" in result.stdout
    assert "connectors" in result.stdout

