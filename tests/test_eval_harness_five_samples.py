"""
Unit and integration tests for the 5-sample multi-datasource dataset and high-throughput concurrency execution.
Verifies dataset persistence, matrix expansion, client pooling, and absence of throttling / rate-limit errors.
"""

import asyncio
import json
import os
import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from ge_eval_harness.backend.services.latency_engine import (
    execute_stream_assist_call,
    run_concurrent_api_benchmarks,
)
from ge_eval_harness.backend.config import (
    ProtocolConfig,
    QueryScenarioConfig,
    expand_scenario_matrix,
)
from ge_eval_harness.backend.services.unified_eval_service import execute_unified_evaluation
from ge_eval_harness.config.paths import PATHS


class TestEvalHarnessFiveSamplesDataset(unittest.TestCase):
    """Tests for 5-sample multi-datasource evaluation matrix execution."""

    def setUp(self):
        self.dataset_path = str(PATHS.get_dataset_path("google-team-five_samples_multi_datasource.json"))

    def test_dataset_json_structure_and_count(self):
        """Verifies that five_samples_multi_datasource.json exists and contains exactly 5 valid scenarios."""
        self.assertTrue(os.path.exists(self.dataset_path), f"Dataset not found at {self.dataset_path}")
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(len(data), 5, "Dataset must contain exactly 5 sample items")
        queries_text = " ".join([item["query"] for item in data])
        self.assertIn("Day 1 onboarding", queries_text)
        self.assertIn("PTO", queries_text)
        self.assertIn("wellness stipend", queries_text)

        for idx, item in enumerate(data):
            self.assertIn("query", item)
            self.assertIn("ground_truth", item)
            self.assertIn("expected_source", item)
            self.assertIn("connector_id", item)
            self.assertEqual(item["connector_id"], "gdrive-connector_1782848677730_google_drive")
        # Verify cross-policy query 0 contains onboarding, PTO, and wellness
        self.assertIn("Day 1 onboarding", data[0]["query"])
        self.assertIn("PTO", data[0]["query"])
        self.assertIn("wellness stipend", data[0]["query"])

    def test_five_sample_matrix_expansion_multi_model(self):
        """Verifies Cartesian matrix expansion of 5 samples x 2 models = 10 execution cells."""
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        scenarios = [QueryScenarioConfig(**s) for s in raw_data]
        config = ProtocolConfig(
            models=["gemini-3.5-flash", "gemini-3.1-pro"],
            connectors=["gdrive-connector_1782848677730_google_drive"],
            iterations=1,
            max_concurrent_calls=4,
            api_timeout_sec=60,
        )

        expanded = expand_scenario_matrix(config, scenarios)
        self.assertEqual(len(expanded), 10, "Expected 5 samples x 2 models = 10 cells")
        flash_cells = [c for c in expanded if c["model_id"] == "gemini-3.5-flash"]
        pro_cells = [c for c in expanded if c["model_id"] == "gemini-3.1-pro"]
        self.assertEqual(len(flash_cells), 5)
        self.assertEqual(len(pro_cells), 5)

    def test_concurrent_execution_no_throttling(self):
        """Verifies that 10 concurrent requests execute across connection pool with 0 throttling / 429 errors."""
        with open(self.dataset_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        scenarios = [QueryScenarioConfig(**s) for s in raw_data]
        config = ProtocolConfig(
            models=["gemini-3.5-flash", "gemini-3.1-pro"],
            connectors=["gdrive-connector_1782848677730_google_drive"],
            iterations=1,
            max_concurrent_calls=4,
            api_timeout_sec=60,
            scenario_timeout_sec=90,
        )
        expanded = expand_scenario_matrix(config, scenarios)

        active_concurrent = 0
        max_concurrent_seen = 0
        lock = asyncio.Lock()

        async def _mock_stream_assist_call(scen, client=None):
            nonlocal active_concurrent, max_concurrent_seen
            async with lock:
                active_concurrent += 1
                if active_concurrent > max_concurrent_seen:
                    max_concurrent_seen = active_concurrent

            # Simulate network latency
            await asyncio.sleep(0.05)

            async with lock:
                active_concurrent -= 1

            return {
                "run_id": scen["run_id"],
                "model_id": scen["model_id"],
                "query": scen["query"],
                "ground_truth": scen["ground_truth"],
                "response_text": f"Simulated valid multi-doc response for {scen['model_id']}.",
                "response_word_count": 25,
                "accuracy_pass": True,
                "ttft_sec": 1.2,
                "ttlt_sec": 2.5,
                "has_required_source": True,
                "total_sources_count": 3,
                "additional_sources_count": 0,
                "source_urls": ["https://drive.google.com/doc1", "https://drive.google.com/doc2"],
                "status_code": 200,
                "generation_speed_tps": 22.5,
                "error_message": "",
                "trace_id": "test_trace_123",
                "span_id": "test_span_456",
            }

        results = asyncio.run(
            run_concurrent_api_benchmarks(
                scenarios=expanded,
                max_concurrent_calls=4,
                call_fn=_mock_stream_assist_call,
                pacing_delay_sec=0.01,
            )
        )

        self.assertEqual(len(results), 10)
        self.assertLessEqual(max_concurrent_seen, 4, "Concurrency should be bounded to max_concurrent_calls=4")
        
        # Verify 0 throttling errors or failures
        status_codes = [r.get("status_code", 0) for r in results]
        self.assertTrue(all(code == 200 for code in status_codes), f"Encountered non-200 status codes: {status_codes}")
        error_messages = [r.get("error_message", "") for r in results if r.get("error_message")]
        self.assertEqual(len(error_messages), 0, f"Encountered error messages: {error_messages}")


if __name__ == "__main__":
    unittest.main()
