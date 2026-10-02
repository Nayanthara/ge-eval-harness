"""
Unit tests for Dual-Mode (Ingested & Federated) Connector Evaluation & Diagnosis.
Verifies that federated connectors (SharePoint, OneDrive, Jira, Confluence, etc.)
are evaluated properly on document discovery, metadata extraction, and navigation citations,
without false pipeline failures due to missing snippets or can_fetch_raw_content: false.
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock

from ge_eval_harness.backend.services.trace_diagnostician import (
    diagnose_scenario_failure,
    compile_full_scenario_logs,
)
from ge_eval_harness.backend.services.llm_judge_service import run_llm_judge
from ge_eval_harness.backend.services.citation_matcher import evaluate_citations


@pytest.mark.asyncio
async def test_federated_connector_clean_pass_bypass():
    """Federated run with verified document citation must cleanly pass without AI failure diagnosis."""
    scenario_record = {
        "query": "What is the paid parental leave policy for full-time employees?",
        "ground_truth": "Full-time employees receive 16 weeks of paid parental leave.",
        "expected_source": "https://company.sharepoint.com/sites/hr/Paid_Parental_Leave_Policy.docx",
        "response_text": "Based on the provided search context, the document is available at https://company.sharepoint.com/sites/hr/Paid_Parental_Leave_Policy.docx",
        "source_urls": "https://company.sharepoint.com/sites/hr/Paid_Parental_Leave_Policy.docx",
        "has_required_source": True,
        "judge_pass": False,  # Model couldn't extract exact text, but found and cited document
        "status_code": 200,
        "connector_mode": "federated",
        "is_federated": True,
        "connectors_used": "sharepoint-federated-connector",
    }
    
    diag = await diagnose_scenario_failure(scenario_record, use_fallback=True)
    assert diag["status"] == "PASS"
    assert diag["failure_category"] == "NONE"
    assert "Federated document discovery and citation verified" in diag["root_cause_summary"]
    assert diag["confidence"] == 1.0


@pytest.mark.asyncio
async def test_federated_retrieval_miss_diagnosis():
    """Federated run that failed to find or cite the document must be classified as FEDERATED_RETRIEVAL_MISS."""
    scenario_record = {
        "query": "What is the paid parental leave policy for full-time employees?",
        "ground_truth": "Full-time employees receive 16 weeks of paid parental leave.",
        "expected_source": "https://company.sharepoint.com/sites/hr/Paid_Parental_Leave_Policy.docx",
        "response_text": "No documents found matching query.",
        "source_urls": "None",
        "has_required_source": False,
        "judge_pass": False,
        "status_code": 200,
        "connector_mode": "federated",
        "is_federated": True,
        "connectors_used": "sharepoint-federated-connector",
    }
    
    diag = await diagnose_scenario_failure(scenario_record, use_fallback=True)
    assert diag["status"] == "FAILED"
    assert diag["failure_category"] == "FEDERATED_RETRIEVAL_MISS"
    assert any("read permissions" in rem or "permissions in the external system" in rem for rem in diag["actionable_remediations"])


@pytest.mark.asyncio
async def test_llm_judge_service_federated_mode_passes_on_document_citation():
    """run_llm_judge in federated mode should PASS when candidate cites the expected document."""
    query = "What is the paid parental leave policy?"
    ground_truth = "Paid Parental Leave"
    expected_source = "https://company.sharepoint.com/sites/hr/Paid_Parental_Leave_Policy.docx"
    response_text = "The relevant policy is located at https://company.sharepoint.com/sites/hr/Paid_Parental_Leave_Policy.docx."
    
    with patch("ge_eval_harness.backend.services.llm_judge_service.HAS_GENAI", False):
        res = await run_llm_judge(
            query=query,
            ground_truth=ground_truth,
            response_text=response_text,
            is_federated=True,
            expected_source=expected_source,
        )
        assert res["judge_pass"] is True


def test_citation_matcher_handles_sharepoint_federated_links():
    """evaluate_citations must match SharePoint document web URLs against expected golden sources."""
    cited = ["https://company.sharepoint.com/sites/hr/Shared%20Documents/Paid_Parental_Leave_Policy.docx"]
    expected = "https://company.sharepoint.com/sites/hr/Shared Documents/Paid_Parental_Leave_Policy.docx"
    
    res = evaluate_citations(cited, expected_sources=expected)
    assert res["has_required_source"] is True
    assert res["all_expected_matched"] is True
