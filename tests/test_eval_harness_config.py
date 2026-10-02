"""
Unit tests for Eval Harness Protocol Configuration Engine and 26-Column Schema (Phase 1).
Follows TDD workflow for claude/eval_framework/ge_eval_harness/config.py and extended glean_eval_service.py.
"""

import csv
import os
import tempfile
import unittest
import pytest

from ge_eval_harness.backend.config import (
    ProtocolConfig,
    QueryScenarioConfig,
    expand_scenario_matrix,
)
from ge_eval_harness.backend.services.glean_eval_service import (
    MASTER_COMPARISON_FIELDNAMES,
    merge_master_comparison_csv,
)


@pytest.mark.quick
class TestEvalHarnessConfigAndSchema(unittest.TestCase):
    def test_protocol_config_defaults(self):
        config = ProtocolConfig()
        self.assertEqual(config.agent_ids, ["core_assistant"])
        self.assertEqual(config.iterations, 5)
        self.assertEqual(config.max_concurrent_calls, 25)
        self.assertEqual(config.scenario_timeout_sec, 120)
        self.assertEqual(config.assist_skipping_mode, "REQUEST_ASSIST")
        self.assertIn("api_stream_assist", config.interfaces)

    def test_expand_scenario_matrix_cartesian_product(self):
        config = ProtocolConfig(
            agent_ids=["core_assistant", "agent_2"],
            models=["gemini-3.5-flash", "gemini-3.1-pro"],
            interfaces=["api_stream_assist"],
            iterations=1,
        )
        scenarios = [
            QueryScenarioConfig(query="q1", ground_truth="gt1"),
            QueryScenarioConfig(query="q2", ground_truth="gt2"),
        ]
        expanded = expand_scenario_matrix(config, scenarios)
        # 2 agents * 2 models * 1 interface * 2 queries = 8 cells
        self.assertEqual(len(expanded), 8)
        self.assertIn("run_id", expanded[0])
        self.assertIn("agent_id", expanded[0])
        self.assertIn("model_id", expanded[0])

    def test_expand_scenario_matrix_multi_connector_and_instruction_sets(self):
        config = ProtocolConfig(
            agent_ids=["core_assistant"],
            models=["gemini-3.5-flash", "gemini-3.1-pro"],
            interfaces=["api_stream_assist"],
            instruction_sets=["Default", "Custom"],
            connectors=["gdrive-connector_1782848677730_google_drive", "jira-connector"],
            iterations=1,
        )
        scenarios = [QueryScenarioConfig(query="q1", ground_truth="gt1")]
        expanded = expand_scenario_matrix(config, scenarios)
        # 1 agent * 2 models * 1 interface * 2 instruction sets * 2 connectors * 1 query = 8 cells
        self.assertEqual(len(expanded), 8)
        self.assertIn("instruction_set", expanded[0])
        self.assertIn("connectors_used", expanded[0])
        self.assertEqual(expanded[0]["instruction_set"], "Default")
        self.assertEqual(expanded[0]["connectors_used"], "gdrive-connector_1782848677730_google_drive")

    def test_extended_master_fieldnames(self):
        self.assertEqual(len(MASTER_COMPARISON_FIELDNAMES), 27)
        self.assertIn("trace_id", MASTER_COMPARISON_FIELDNAMES)
        self.assertIn("span_id", MASTER_COMPARISON_FIELDNAMES)
        self.assertIn("evidence_match", MASTER_COMPARISON_FIELDNAMES)
        self.assertIn("generation_speed_tps", MASTER_COMPARISON_FIELDNAMES)
        self.assertIn("error_message", MASTER_COMPARISON_FIELDNAMES)

    def test_master_comparison_schema_json(self):
        import json
        schema_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "config",
            "master_comparison_schema.json",
        )
        self.assertTrue(os.path.exists(schema_path))
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
        self.assertIn("properties", schema)
        self.assertEqual(len(schema["properties"]), 27)
        for field in MASTER_COMPARISON_FIELDNAMES:
            self.assertIn(field, schema["properties"])

    def test_glean_csv_merge_with_extended_schema(self):
        ge_row = {
            "run_id": "ge_1",
            "system": "Gemini_Enterprise",
            "model_id": "gemini-3.5-flash",
            "instruction_set": "Default",
            "agent_id": "core_assistant",
            "connectors_used": "Google Drive",
            "iteration": 1,
            "query": "q",
            "ground_truth": "gt",
            "response_text": "resp",
            "response_word_count": 1,
            "accuracy_pass": True,
            "judge_pass": True,
            "judge_confidence": 1.0,
            "judge_reasoning": "pass",
            "ttft_sec": 1.1,
            "ttlt_sec": 2.2,
            "has_required_source": True,
            "total_sources_count": 1,
            "additional_sources_count": 0,
            "source_urls": "url",
            "status_code": 200,
            "trace_id": "trace-123",
            "span_id": "span-456",
            "generation_speed_tps": 15.5,
            "error_message": "",
        }
        glean_row = {
            "run_id": "glean_1",
            "system": "Glean_Web",
            "model_id": "glean-default",
            "instruction_set": "N/A",
            "agent_id": "N/A",
            "connectors_used": "Glean Web App",
            "iteration": 1,
            "query": "q",
            "ground_truth": "gt",
            "response_text": "glean resp",
            "response_word_count": 2,
            "accuracy_pass": True,
            "judge_pass": True,
            "judge_confidence": 1.0,
            "judge_reasoning": "pass",
            "ttft_sec": 0.0,
            "ttlt_sec": 3.0,
            "has_required_source": True,
            "total_sources_count": 1,
            "additional_sources_count": 0,
            "source_urls": "url",
            "status_code": 200,
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tf:
            temp_path = tf.name

        try:
            merged = merge_master_comparison_csv(
                ge_rows=[ge_row],
                glean_rows=[glean_row],
                output_csv_path=temp_path,
            )
            self.assertEqual(len(merged), 2)
            with open(temp_path, mode="r", encoding="utf-8") as f:
                reader = list(csv.DictReader(f))
                self.assertEqual(len(reader), 2)
                self.assertEqual(reader[0]["trace_id"], "trace-123")
                # Offline Glean row should fall back to empty string for latency trace fields
                self.assertEqual(reader[1].get("trace_id", ""), "")
                self.assertEqual(reader[1].get("generation_speed_tps", ""), "")
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)


if __name__ == "__main__":
    unittest.main()
