"""
Unit tests for BigQuery and Dataform Time-Series Analytics Pipeline in Eval Harness.
"""

import pytest
from ge_eval_harness.backend.services.bigquery_analytics import (
    BigQueryAnalyticsPipeline,
    export_records_to_bigquery,
    generate_dataform_ddl,
)
from ge_eval_harness.backend.services.glean_eval_service import MASTER_COMPARISON_FIELDNAMES


def test_export_records_to_bigquery_dry_run():
    """Test exporting 26-column master comparison records in dry_run mode."""
    sample_records = [
        {
            "run_id": "test_run_001",
            "system": "Gemini_Enterprise",
            "model_id": "gemini-3.5-flash",
            "instruction_set": "Default",
            "agent_id": "core_assistant",
            "connectors_used": "gdrive-connector_1782848677730_google_drive",
            "iteration": 1,
            "query": "what is the wellness stipend?",
            "ground_truth": "$150 per month",
            "response_text": "The wellness stipend is $150 per month.",
            "response_word_count": 7,
            "accuracy_pass": True,
            "judge_pass": True,
            "judge_confidence": 1.0,
            "judge_reasoning": "Factual match.",
            "ttft_sec": 0.45,
            "ttlt_sec": 1.15,
            "has_required_source": True,
            "total_sources_count": 1,
            "additional_sources_count": 0,
            "source_urls": "https://drive.google.com/test",
            "status_code": 200,
            "trace_id": "0123456789abcdef0123456789abcdef",
            "span_id": "0123456789abcdef",
            "generation_speed_tps": 6.0,
            "error_message": "",
        }
    ]

    result = export_records_to_bigquery(
        records=sample_records,
        dataset_id="ge_eval_benchmarks",
        table_id="master_comparison_records",
        dry_run=True,
    )

    assert result["status"] == "success"
    assert result["records_exported"] == 1
    assert result["dry_run"] is True


def test_generate_dataform_ddl():
    """Verify Dataform/BigQuery SQL DDL generation matches all 26 schema column names."""
    ddl = generate_dataform_ddl(dataset_id="ge_eval_benchmarks", table_id="master_comparison_records")
    assert "CREATE OR REPLACE TABLE" in ddl
    assert "ge_eval_benchmarks.master_comparison_records" in ddl

    for field in MASTER_COMPARISON_FIELDNAMES:
        assert field in ddl, f"Column {field} missing from generated DDL"

    # Verify key data types in DDL
    assert "run_id STRING" in ddl
    assert "accuracy_pass BOOL" in ddl
    assert "ttft_sec FLOAT64" in ddl
    assert "response_word_count INT64" in ddl
    assert "status_code INT64" in ddl


def test_bigquery_pipeline_class_validation():
    """Verify BigQueryAnalyticsPipeline validates schema structure and reports errors."""
    pipeline = BigQueryAnalyticsPipeline(
        project_id="genai-alpha-422116",
        dataset_id="ge_eval_benchmarks",
        table_id="master_comparison_records",
    )

    valid_record = {field: "test" if "id" in field or field == "system" else 0 for field in MASTER_COMPARISON_FIELDNAMES}
    is_valid, errors = pipeline.validate_record(valid_record)
    assert is_valid is True
    assert len(errors) == 0

    invalid_record = {"run_id": "only_run_id"}
    is_valid, errors = pipeline.validate_record(invalid_record)
    assert is_valid is False
    assert len(errors) > 0
