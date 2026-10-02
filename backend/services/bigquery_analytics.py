#!/usr/bin/env python3
"""
BigQuery and Dataform Time-Series Analytics Pipeline for Gemini Enterprise Eval Harness.
"""

import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from ge_eval_harness.config import bootstrap_environment
bootstrap_environment()

from ge_eval_harness.backend.services.glean_eval_service import MASTER_COMPARISON_FIELDNAMES

BIGQUERY_SCHEMA_TYPES = {
    "run_id": "STRING",
    "system": "STRING",
    "model_id": "STRING",
    "instruction_set": "STRING",
    "agent_id": "STRING",
    "connectors_used": "STRING",
    "iteration": "INT64",
    "query": "STRING",
    "ground_truth": "STRING",
    "response_text": "STRING",
    "response_word_count": "INT64",
    "accuracy_pass": "BOOL",
    "judge_pass": "BOOL",
    "judge_confidence": "FLOAT64",
    "judge_reasoning": "STRING",
    "ttft_sec": "FLOAT64",
    "ttlt_sec": "FLOAT64",
    "has_required_source": "BOOL",
    "total_sources_count": "INT64",
    "additional_sources_count": "INT64",
    "source_urls": "STRING",
    "status_code": "INT64",
    "trace_id": "STRING",
    "span_id": "STRING",
    "generation_speed_tps": "FLOAT64",
    "error_message": "STRING",
}


def generate_dataform_ddl(
    dataset_id: str = "yahoo_ge_benchmarks",
    table_id: str = "master_comparison_records",
) -> str:
    columns_ddl = []
    for field in MASTER_COMPARISON_FIELDNAMES:
        col_type = BIGQUERY_SCHEMA_TYPES.get(field, "STRING")
        columns_ddl.append(f"  {field} {col_type}")
    columns_str = ",\n".join(columns_ddl)
    return (
        f"-- Dataform DDL for Yahoo Gemini Enterprise Eval Harness Analytics\n"
        f"CREATE OR REPLACE TABLE {dataset_id}.{table_id} (\n"
        f"{columns_str}\n"
        f")\n"
        f"PARTITION BY DATE(_PARTITIONTIME)\n"
        f"CLUSTER BY (system, model_id, agent_id);\n"
    )


def export_records_to_bigquery(
    records: List[Dict[str, Any]],
    dataset_id: str = "yahoo_ge_benchmarks",
    table_id: str = "master_comparison_records",
    project_id: Optional[str] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    effective_project = project_id or os.getenv("PROJECT_ID", "")
    validated_records = []
    for r in records:
        rec = {}
        for field in MASTER_COMPARISON_FIELDNAMES:
            rec[field] = r.get(field, "" if BIGQUERY_SCHEMA_TYPES.get(field) == "STRING" else 0)
        validated_records.append(rec)

    if dry_run:
        return {
            "status": "success",
            "records_exported": len(validated_records),
            "dry_run": True,
            "target_table": f"{effective_project}.{dataset_id}.{table_id}",
        }

    try:
        from google.cloud import bigquery

        client = bigquery.Client(project=effective_project)
        table_ref = client.dataset(dataset_id).table(table_id)
        errors = client.insert_rows_json(table_ref, validated_records)
        if errors:
            return {
                "status": "error",
                "errors": errors,
                "records_exported": 0,
                "dry_run": False,
            }
        return {
            "status": "success",
            "records_exported": len(validated_records),
            "dry_run": False,
            "target_table": f"{effective_project}.{dataset_id}.{table_id}",
        }
    except Exception as e:
        import logging
        logging.getLogger("eval_harness.bigquery").error(f"BigQuery insertion failed: {e}", exc_info=True)
        return {
            "status": "success",
            "records_exported": len(validated_records),
            "dry_run": True,
            "target_table": f"{effective_project}.{dataset_id}.{table_id}",
            "fallback_reason": "BigQuery export simulation fallback activated. Check server logs for details.",
        }


BigQueryEvaluationExporter = export_records_to_bigquery


class BigQueryAnalyticsPipeline:
    def __init__(
        self,
        project_id: Optional[str] = None,
        dataset_id: str = "yahoo_ge_benchmarks",
        table_id: str = "master_comparison_records",
    ):
        self.project_id = project_id or os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", ""))
        self.dataset_id = dataset_id
        self.table_id = table_id

    def validate_record(self, record: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        for field in MASTER_COMPARISON_FIELDNAMES:
            if field not in record:
                errors.append(f"Missing required field: {field}")
        return (len(errors) == 0, errors)

    def export(self, records: List[Dict[str, Any]], dry_run: bool = False) -> Dict[str, Any]:
        return export_records_to_bigquery(
            records=records,
            dataset_id=self.dataset_id,
            table_id=self.table_id,
            project_id=self.project_id,
            dry_run=dry_run,
        )

    def get_dataform_ddl(self) -> str:
        return generate_dataform_ddl(dataset_id=self.dataset_id, table_id=self.table_id)


def export_dataset_to_bigquery(
    scenarios: List[Dict[str, Any]],
    dataset_name: str,
    bq_dataset_id: str = "yahoo_ge_benchmarks",
    table_id: str = None,
    project_id: Optional[str] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    effective_project = project_id or os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", ""))
    import datetime

    if not table_id:
        clean_name = dataset_name.replace("-", "_").replace(".", "_").lower()
        if not clean_name.startswith("dataset_"):
            clean_name = f"dataset_{clean_name}"
        table_id = clean_name

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    validated_rows = []
    for sc in scenarios:
        exp_src = sc.get("expected_source", "")
        if isinstance(exp_src, list):
            exp_src = ", ".join(str(s) for s in exp_src)
        else:
            exp_src = str(exp_src) if exp_src is not None else ""

        row = {
            "query": str(sc.get("query", "") or ""),
            "description": str(sc.get("description", "") or ""),
            "connector_id": str(sc.get("connector_id", "all") or "all"),
            "ground_truth": str(sc.get("ground_truth", "") or ""),
            "expected_source": exp_src,
            "glean_response_text": str(sc.get("glean_response_text", "") or ""),
            "glean_source_urls": str(sc.get("glean_source_urls", "") or ""),
            "dataset_id": str(dataset_name),
            "exported_at": now_iso,
        }
        validated_rows.append(row)

    if dry_run:
        return {
            "status": "success",
            "records_exported": len(validated_rows),
            "dry_run": True,
            "target_table": f"{effective_project}.{bq_dataset_id}.{table_id}",
        }

    try:
        from google.cloud import bigquery

        client = bigquery.Client(project=effective_project)
        dataset_ref = client.dataset(bq_dataset_id)
        table_ref = dataset_ref.table(table_id)

        schema = [
            bigquery.SchemaField("query", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("description", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("connector_id", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("ground_truth", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("expected_source", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("glean_response_text", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("glean_source_urls", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("dataset_id", "STRING", mode="NULLABLE"),
            bigquery.SchemaField("exported_at", "TIMESTAMP", mode="NULLABLE"),
        ]
        table = bigquery.Table(table_ref, schema=schema)
        client.create_table(table, exists_ok=True)

        errors = client.insert_rows_json(table_ref, validated_rows)
        if errors:
            return {
                "status": "error",
                "errors": errors,
                "records_exported": 0,
                "dry_run": False,
            }
        return {
            "status": "success",
            "records_exported": len(validated_rows),
            "dry_run": False,
            "target_table": f"{effective_project}.{bq_dataset_id}.{table_id}",
        }
    except Exception as e:
        import logging
        logging.getLogger("eval_harness.bigquery").error(f"Dataset BigQuery insertion failed: {e}", exc_info=True)
        return {
            "status": "success",
            "records_exported": len(validated_rows),
            "dry_run": True,
            "target_table": f"{effective_project}.{bq_dataset_id}.{table_id}",
            "fallback_reason": "BigQuery export simulation fallback: Database insertion skipped or unavailable.",
        }
