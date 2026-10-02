"""
Unit tests for Eval Harness High-Concurrency Latency Engine (Phase 2).
Follows TDD workflow for claude/eval_framework/ge_eval_harness/latency_engine.py.
"""

import asyncio
import unittest
import pytest
from ge_eval_harness.backend.services.latency_engine import (
    calculate_latency_stats,
    run_concurrent_api_benchmarks,
)


class TestEvalHarnessLatencyEngine(unittest.TestCase):
    def test_calculate_latency_stats_percentiles(self):
        data = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0]
        stats = calculate_latency_stats(data)
        self.assertEqual(stats["min"], 1.0)
        self.assertEqual(stats["p50"], 5.5)
        self.assertEqual(stats["p90"], 9.1)
        self.assertEqual(stats["p95"], 9.55)
        self.assertEqual(stats["max"], 10.0)
        self.assertAlmostEqual(stats["avg"], 5.5)

    def test_calculate_latency_stats_empty(self):
        stats = calculate_latency_stats([])
        self.assertEqual(stats["min"], 0.0)
        self.assertEqual(stats["p50"], 0.0)
        self.assertEqual(stats["p99"], 0.0)
        self.assertEqual(stats["avg"], 0.0)

    def test_semaphore_concurrency_limiter_bound(self):
        max_concurrent = 2
        active_calls = 0
        max_observed_calls = 0
        lock = asyncio.Lock()

        async def _mock_task(scenario):
            nonlocal active_calls, max_observed_calls
            async with lock:
                active_calls += 1
                if active_calls > max_observed_calls:
                    max_observed_calls = active_calls
            await asyncio.sleep(0.05)
            async with lock:
                active_calls -= 1
            return {
                "run_id": scenario["run_id"],
                "ttft_sec": 0.5,
                "ttlt_sec": 1.0,
                "response_word_count": 10,
                "generation_speed_tps": 10.0,
                "trace_id": "trace-123",
                "span_id": "span-456",
                "error_message": "",
            }

        scenarios = [
            {"run_id": f"s_{i}", "query": f"q_{i}", "model_id": "gemini-3.5-flash"}
            for i in range(8)
        ]

        results = asyncio.run(
            run_concurrent_api_benchmarks(
                scenarios=scenarios,
                max_concurrent_calls=max_concurrent,
                call_fn=_mock_task,
            )
        )
        self.assertEqual(len(results), 8)
        self.assertLessEqual(max_observed_calls, max_concurrent)
        self.assertEqual(max_observed_calls, max_concurrent)

    def test_parallel_concurrency_and_progress_tracking(self):
        max_concurrent = 10
        active_calls = 0
        max_observed_calls = 0
        lock = asyncio.Lock()
        progress_reports = []

        async def _mock_parallel_task(scenario, client=None):
            nonlocal active_calls, max_observed_calls
            async with lock:
                active_calls += 1
                if active_calls > max_observed_calls:
                    max_observed_calls = active_calls
            # Sleep slightly to let all 10 parallel workers enter simultaneously
            await asyncio.sleep(0.05)
            async with lock:
                active_calls -= 1
            return {
                "run_id": scenario["run_id"],
                "ttft_sec": 0.2,
                "ttlt_sec": 0.5,
                "status_code": 200,
            }

        def _on_prog(completed, total):
            progress_reports.append((completed, total))

        scenarios = [
            {"run_id": f"s_{i}", "query": f"q_{i}", "model_id": "gemini-3.5-flash"}
            for i in range(10)
        ]

        results = asyncio.run(
            run_concurrent_api_benchmarks(
                scenarios=scenarios,
                max_concurrent_calls=max_concurrent,
                call_fn=_mock_parallel_task,
                on_progress=_on_prog,
            )
        )
        self.assertEqual(len(results), 10)
        # All 10 parallel tasks launched simultaneously
        self.assertEqual(max_observed_calls, 10)
        # Progress callback recorded all 10 completions
        self.assertEqual(len(progress_reports), 10)
        self.assertEqual(progress_reports[-1], (10, 10))

    def test_independent_session_provisioning_per_call(self):
        from unittest.mock import patch, AsyncMock
        import httpx
        from ge_eval_harness.backend.services.latency_engine import execute_stream_assist_call

        created_sessions = []

        async def _mock_invoke(client, endpoint_url, headers, model_id, instruction_set, iteration_idx, session_name=None, **kwargs):
            return {
                "run_id": "test_run",
                "model_id": model_id,
                "instruction_set": instruction_set,
                "iteration": 1,
                "response_text": "Mocked response",
                "response_word_count": 2,
                "accuracy_pass": True,
                "ttft_sec": 0.1,
                "ttlt_sec": 0.2,
                "status_code": 200,
                "has_required_source": True,
                "total_sources_count": 1,
                "additional_sources_count": 0,
                "source_urls": "None",
            }

        # Mock httpx client to intercept session creation
        from unittest.mock import MagicMock
        class MockClient:
            async def post(self, url, json=None, headers=None):
                pseudo_id = json.get("userPseudoId", "") if json else ""
                created_sessions.append(pseudo_id)
                sess_name = f"projects/genai-alpha-422116/locations/global/collections/default_collection/engines/enterprise_engine_1780365163254/sessions/sess-{pseudo_id}"
                resp = MagicMock()
                resp.status_code = 200
                resp.json.return_value = {"name": sess_name}
                return resp

        scenario_1 = {"query": "Q1", "model_id": "gemini-3.5-flash"}
        scenario_2 = {"query": "Q2", "model_id": "gemini-3.5-flash"}

        with patch("ge_eval_harness.backend.eval_judge_service.invoke_stream_assist_eval", side_effect=_mock_invoke):
            with patch("ge_eval_harness.backend.eval_judge_service.get_gcp_credentials") as mock_creds:
                mock_c = AsyncMock()
                mock_c.token = "mock-tok"
                mock_creds.return_value = (mock_c, "genai-alpha-422116")
                res1 = asyncio.run(execute_stream_assist_call(scenario_1, client=MockClient()))
                res2 = asyncio.run(execute_stream_assist_call(scenario_2, client=MockClient()))

        self.assertIn("session_name", res1)
        self.assertIn("session_name", res2)
        # Ensure independent sessions with distinct pseudo user IDs were provisioned
        self.assertEqual(len(created_sessions), 2)
        self.assertNotEqual(created_sessions[0], created_sessions[1])
        self.assertNotEqual(res1["session_name"], res2["session_name"])


if __name__ == "__main__":
    unittest.main()
