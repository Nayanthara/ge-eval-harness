import asyncio
import csv
import os
import tempfile
import unittest
from unittest.mock import patch
import pytest

from ge_eval_harness.backend.config import ProtocolConfig, QueryScenarioConfig
from ge_eval_harness.backend.services.glean_eval_service import MASTER_COMPARISON_FIELDNAMES
from ge_eval_harness.backend.services.unified_eval_service import (
    execute_unified_evaluation,
)


@pytest.mark.quick
class TestEvalHarnessUnifiedService(unittest.TestCase):
    @patch("ge_eval_harness.backend.services.unified_eval_service.run_concurrent_api_benchmarks")
    def test_execute_unified_evaluation_pipeline(self, mock_benchmarks):
        config = ProtocolConfig(
            agent_ids=["core_assistant"],
            models=["gemini-3.5-flash"],
            iterations=1,
            max_concurrent_calls=2,
        )
        scenarios = [
            QueryScenarioConfig(
                query="how much is the wellness stipend?",
                ground_truth="$150 per month",
            ),
            QueryScenarioConfig(
                query="what is PTO carryover?",
                ground_truth="5 days",
            ),
        ]

        mock_benchmarks.return_value = [
            {
                "status_code": 200,
                "response_text": "Provides $150 reimbursement for fitness classes.",
                "ttft_sec": 0.5,
                "ttlt_sec": 1.0,
                "response_word_count": 7,
                "generation_speed_tps": 7.0,
                "trace_id": "00000000000000000000000000000001",
                "span_id": "0000000000000001",
                "source_urls": ["https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view"],
                "error_message": "",
            },
            {
                "status_code": 200,
                "response_text": "5 days carryover allowed.",
                "ttft_sec": 0.4,
                "ttlt_sec": 0.8,
                "response_word_count": 4,
                "generation_speed_tps": 5.0,
                "trace_id": "00000000000000000000000000000002",
                "span_id": "0000000000000002",
                "source_urls": ["https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view"],
                "error_message": "",
            }
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            out_csv = os.path.join(tmpdir, "test_unified_results.csv")
            res = asyncio.run(
                execute_unified_evaluation(
                    protocol_config=config,
                    scenarios=scenarios,
                    output_csv_path=out_csv,
                    use_fallback_judge=True,
                )
            )
            self.assertIn("records", res)
            self.assertIn("latency_summary", res)
            self.assertEqual(len(res["records"]), 2)
            self.assertTrue(os.path.exists(out_csv))

            # Verify schema compliance
            rec0 = res["records"][0]
            for field in MASTER_COMPARISON_FIELDNAMES:
                self.assertIn(field, rec0)

            self.assertIn("ttft_sec", res["latency_summary"])
            self.assertIn("p50", res["latency_summary"]["ttft_sec"])

    @patch("ge_eval_harness.backend.services.unified_eval_service.run_concurrent_api_benchmarks")
    def test_execute_unified_evaluation_with_tracing_and_multi_connectors(self, mock_benchmarks):
        config = ProtocolConfig(
            agent_ids=["core_assistant"],
            models=["gemini-3.5-flash"],
            interfaces=["api_stream_assist"],
            instruction_sets=["Default", "Custom"],
            connectors=["gdrive-connector_1782848677730_google_drive"],
            iterations=1,
            max_concurrent_calls=2,
        )
        scenarios = [
            QueryScenarioConfig(
                query="how much is the wellness stipend?",
                ground_truth="$150 per month",
            ),
        ]

        mock_benchmarks.return_value = [
            {
                "status_code": 200,
                "response_text": "Provides $150 reimbursement for fitness classes.",
                "ttft_sec": 0.5,
                "ttlt_sec": 1.0,
                "response_word_count": 7,
                "generation_speed_tps": 7.0,
                "trace_id": "00000000000000000000000000000001",
                "span_id": "0000000000000001",
                "source_urls": ["https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view"],
                "error_message": "",
            },
            {
                "status_code": 200,
                "response_text": "Provides $150 reimbursement for fitness classes.",
                "ttft_sec": 0.5,
                "ttlt_sec": 1.0,
                "response_word_count": 7,
                "generation_speed_tps": 7.0,
                "trace_id": "00000000000000000000000000000002",
                "span_id": "0000000000000002",
                "source_urls": ["https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view"],
                "error_message": "",
            }
        ]

        res = asyncio.run(
            execute_unified_evaluation(
                protocol_config=config,
                scenarios=scenarios,
                use_fallback_judge=True,
            )
        )
        self.assertEqual(len(res["records"]), 2) # 1 agent * 1 model * 1 interface * 2 instruction_sets * 1 connector * 1 scenario = 2 records
        rec0 = res["records"][0]
        self.assertIn("trace_id", rec0)
        self.assertIn("span_id", rec0)
        self.assertEqual(len(rec0["trace_id"]), 32)
        self.assertEqual(len(rec0["span_id"]), 16)
        self.assertEqual(rec0["instruction_set"], "Default")
        self.assertEqual(rec0["connectors_used"], "gdrive-connector_1782848677730_google_drive")
        self.assertEqual(res["records"][1]["instruction_set"], "Custom")

    @patch("ge_eval_harness.backend.services.unified_eval_service.run_concurrent_api_benchmarks")
    def test_execute_unified_evaluation_with_glean_scenarios(self, mock_benchmarks):
        config = ProtocolConfig(
            agent_ids=["core_assistant"],
            models=["gemini-3.5-flash"],
            iterations=1,
            max_concurrent_calls=2,
        )
        scenarios = [
            QueryScenarioConfig(
                query="how much is the wellness stipend?",
                ground_truth="$150 per month",
                glean_response_text="Glean says the wellness stipend is $100 per month.",
                glean_source_urls="https://drive.google.com/file/d/123/view",
            ),
        ]

        mock_benchmarks.return_value = [
            {
                "status_code": 200,
                "response_text": "Provides $150 reimbursement for fitness classes.",
                "ttft_sec": 0.5,
                "ttlt_sec": 1.0,
                "response_word_count": 7,
                "generation_speed_tps": 7.0,
                "trace_id": "00000000000000000000000000000001",
                "span_id": "0000000000000001",
                "source_urls": ["https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view"],
                "error_message": "",
            }
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            out_csv = os.path.join(tmpdir, "test_unified_glean_results.csv")
            res = asyncio.run(
                execute_unified_evaluation(
                    protocol_config=config,
                    scenarios=scenarios,
                    output_csv_path=out_csv,
                    use_fallback_judge=True,
                )
            )
            # The result contains BOTH the GE record and the Glean record
            self.assertIn("records", res)
            self.assertEqual(len(res["records"]), 2) # Both GE record and Glean record
            
            # Let's read the CSV file to verify both rows are present
            self.assertTrue(os.path.exists(out_csv))
            with open(out_csv, mode="r", encoding="utf-8") as f:
                reader = list(csv.DictReader(f))
                self.assertEqual(len(reader), 2)
                
                # Check GE Row
                ge_row = next(r for r in reader if r["system"] == "Gemini_Enterprise")
                self.assertEqual(ge_row["query"], "how much is the wellness stipend?")
                self.assertEqual(ge_row["model_id"], "gemini-3.5-flash")
                
                # Check Glean Row
                glean_row = next(r for r in reader if r["system"] == "Glean_Web")
                self.assertEqual(glean_row["query"], "how much is the wellness stipend?")
                self.assertEqual(glean_row["model_id"], "glean-default")
                self.assertEqual(glean_row["response_text"], "Glean says the wellness stipend is $100 per month.")
                self.assertEqual(glean_row["source_urls"], "https://drive.google.com/file/d/123/view")

    def test_empty_scenario_handling(self):
        config = ProtocolConfig(iterations=1)
        res = asyncio.run(
            execute_unified_evaluation(
                protocol_config=config,
                scenarios=[],
                use_fallback_judge=True,
            )
        )
        self.assertEqual(len(res["records"]), 0)
        self.assertEqual(res["latency_summary"]["ttft_sec"]["avg"], 0.0)


if __name__ == "__main__":
    unittest.main()
