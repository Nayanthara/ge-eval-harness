"""
Unit tests for Playwright Browser UI Automation Service in Eval Harness.
"""

import pytest
from ge_eval_harness.backend.services.browser_ui_service import (
    BrowserUIService,
    record_ui_session,
)
from ge_eval_harness.backend.services.glean_eval_service import MASTER_COMPARISON_FIELDNAMES


@pytest.mark.asyncio
async def test_record_ui_session_ge_mock():
    """Verify that recording a Gemini Enterprise UI session returns a 26-column record."""
    service = BrowserUIService(cdp_port=9223, headless=True)
    rec = await service.record_ui_session(
        system="Gemini_Enterprise",
        query="what is the wellness stipend?",
        ground_truth="$150 per month",
        mock_offline=True,
    )

    assert isinstance(rec, dict)
    for field in MASTER_COMPARISON_FIELDNAMES:
        assert field in rec, f"Missing required column in recorded session: {field}"

    assert rec["system"] == "Gemini_Enterprise"
    assert rec["query"] == "what is the wellness stipend?"
    assert rec["ground_truth"] == "$150 per month"
    assert rec["model_id"] == "gemini-3.5-flash"
    assert "ui_preview" in rec.get("agent_id", "") or rec.get("agent_id") == "core_assistant"
    assert rec["ttlt_sec"] > 0
    assert rec["status_code"] == 200


@pytest.mark.asyncio
async def test_record_ui_session_glean_mock():
    """Verify that recording a Glean Web App UI session returns a valid 26-column record."""
    service = BrowserUIService(cdp_port=9223, headless=True)
    rec = await service.record_ui_session(
        system="Glean_Web",
        query="what is the PTO rollover policy?",
        ground_truth="5 days",
        mock_offline=True,
    )

    assert isinstance(rec, dict)
    for field in MASTER_COMPARISON_FIELDNAMES:
        assert field in rec, f"Missing required column in recorded session: {field}"

    assert rec["system"] == "Glean_Web"
    assert rec["model_id"] == "glean-default"
    assert rec["connectors_used"] == "Glean Web App"
    assert rec["status_code"] == 200
