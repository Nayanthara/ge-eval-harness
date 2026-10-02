"""
Unit tests for Eval Harness Web GUI API Routes (/api/run_benchmark, /api/export_master_csv) and Headless CLI Wrapper.
"""

import os
import json
import unittest
# Set TESTING env before importing app
os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
from ge_eval_harness.backend.app import app
from ge_eval_harness.backend.services.glean_eval_service import MASTER_COMPARISON_FIELDNAMES
from ge_eval_harness.config.paths import PATHS

class TestEvalHarnessAppAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_api_run_benchmark_endpoint(self):
        payload = {
            "scenarios": [
                {
                    "query": "how much is the wellness stipend?",
                    "ground_truth": "$150 per month",
                }
            ],
            "iterations": 1,
            "max_concurrent_calls": 2,
            "use_fallback_judge": True,
        }
        res = self.client.post(
            "/api/run_benchmark",
            json=payload
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("latency_summary", data)
        self.assertIn("records_count", data)
        self.assertEqual(data["records_count"], 1)

    def test_api_run_benchmark_with_timeouts(self):
        payload = {
            "scenarios": [
                {
                    "query": "how much is the wellness stipend?",
                    "ground_truth": "$150 per month",
                }
            ],
            "iterations": 1,
            "max_concurrent_calls": 1,
            "api_timeout_sec": 15,
            "scenario_timeout_sec": 30,
            "run_timeout_sec": 120,
            "use_fallback_judge": True,
        }
        res = self.client.post(
            "/api/run_benchmark",
            json=payload
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")

    def test_api_run_benchmark_background_endpoint(self):
        payload = {
            "scenarios": [
                {
                    "query": "how much is the wellness stipend?",
                    "ground_truth": "$150 per month",
                }
            ],
            "iterations": 1,
            "max_concurrent_calls": 1,
            "background": True,
            "use_fallback_judge": True,
        }
        res = self.client.post(
            "/api/run_benchmark",
            json=payload
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "running")
        self.assertIn("run_id", data)
        self.assertIn("started in background", data.get("message", ""))

    def test_api_run_benchmark_offline_adc_mock(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {"TESTING": "true", "MOCK_ADC": "true"}):
            payload = {
                "scenarios": [
                    {
                        "query": "how much is the wellness stipend?",
                        "ground_truth": "$150 per month",
                    }
                ],
                "iterations": 1,
                "max_concurrent_calls": 1,
                "use_fallback_judge": True,
            }
            res = self.client.post(
                "/api/run_benchmark",
                json=payload
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data.get("status"), "success")

    def test_api_export_master_csv_endpoint(self):
        res = self.client.get("/api/export_master_csv")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("content-type", ""))
        first_line = res.content.decode("utf-8").splitlines()[0]
        for header in MASTER_COMPARISON_FIELDNAMES:
            self.assertIn(header, first_line)

    def test_cli_wrapper_delegation(self):
        import asyncio
        from ge_eval_harness.backend.services.unified_eval_service import run_unified_cli
        res = asyncio.run(
            run_unified_cli(
                scenarios=[{"query": "q", "ground_truth": "gt"}],
                iterations=1,
                max_concurrent_calls=1,
                use_fallback_judge=True,
            )
        )
        self.assertEqual(len(res["records"]), 1)
        self.assertIn("latency_summary", res)

    def test_api_discovery_inspect_endpoint(self):
        res = self.client.get("/api/discovery/inspect?mock=true")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("collections", data)
        self.assertIn("sample_trace", data)

    def test_api_browser_record_session_endpoint(self):
        payload = {
            "system": "Gemini_Enterprise",
            "query": "what is the wellness stipend?",
            "ground_truth": "$150 per month",
            "mock_offline": True,
        }
        res = self.client.post(
            "/api/browser/record_session",
            json=payload
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("record", data)
        rec = data["record"]
        for field in MASTER_COMPARISON_FIELDNAMES:
            self.assertIn(field, rec)

    def test_api_export_bigquery_endpoint(self):
        payload = {
            "dataset_id": "ge_eval_benchmarks",
            "table_id": "master_comparison_records",
            "dry_run": True,
        }
        res = self.client.post(
            "/api/export/bigquery",
            json=payload
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("records_exported", data)

    def test_api_list_runs_endpoint(self):
        res = self.client.get("/api/runs")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("runs", data)

    def test_api_get_run_events_endpoint(self):
        res = self.client.get("/api/runs/non_existent_run_id/events")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("events"), [])

    def test_api_run_benchmark_with_gdrive_small_dataset(self):
        payload = {
            "dataset_key": "google-team-gdrive_dev_golden",
            "models": ["gemini-3.5-flash"],
            "iterations": 1,
            "max_concurrent_calls": 10,
            "use_fallback_judge": True,
        }
        res = self.client.post(
            "/api/run_benchmark",
            json=payload
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("records_count"), 14)
        self.assertIn("latency_summary", data)

    def test_api_run_events_metadata_and_batch_formula(self):
        # Run a benchmark with custom run_id
        run_id = "test_run_metadata_batch_calc_123"
        payload = {
            "dataset_key": "google-team-gdrive_dev_golden",
            "models": ["gemini-3.5-flash"],
            "iterations": 1,
            "max_concurrent_calls": 10,
            "use_fallback_judge": True,
            "run_id": run_id,
        }
        res = self.client.post(
            "/api/run_benchmark",
            json=payload
        )
        self.assertEqual(res.status_code, 200)

        # Check events endpoint
        events_res = self.client.get(f"/api/runs/{run_id}/events")
        self.assertEqual(events_res.status_code, 200)
        events_data = events_res.json()
        self.assertEqual(events_data.get("status"), "success")
        self.assertIn("run_config", events_data)
        config = events_data["run_config"]
        self.assertEqual(config.get("sample_count"), 14)
        self.assertEqual(config.get("total_requests"), 14)
        self.assertEqual(config.get("max_concurrent_calls"), 10)

    def test_api_settings_sysinfo_endpoint(self):
        res = self.client.get("/api/settings/sysinfo")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertIn("sysinfo", data)

    def test_api_download_dataset_template_file(self):
        # 1. Blank template has header only (0 rows)
        res = self.client.get("/api/template/dataset")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("content-type", ""))
        self.assertIn("query,ground_truth,expected_source,connector_id", res.text)
        lines = [line.strip() for line in res.text.strip().split("\n") if line.strip()]
        self.assertEqual(len(lines), 1, "Blank template must only have the header line")

        # 2. Template with samples via dedicated endpoint
        res_samples = self.client.get("/api/template/dataset/samples")
        self.assertEqual(res_samples.status_code, 200)
        self.assertIn("text/csv", res_samples.headers.get("content-type", ""))
        sample_lines = [line.strip() for line in res_samples.text.strip().split("\n") if line.strip()]
        self.assertEqual(len(sample_lines), 4, "Sample template must have 1 header line and 3 sample rows")

        # 3. Template with samples via query param
        res_param = self.client.get("/api/template/dataset?with_samples=true")
        self.assertEqual(res_param.status_code, 200)
        self.assertEqual(len([line.strip() for line in res_param.text.strip().split("\n") if line.strip()]), 4)

    def test_api_upload_custom_dataset(self):
        csv_content = (
            "query,ground_truth,expected_source,connector_id\n"
            "how much is the wellness stipend?,$150 per month,https://drive.google.com/open?id=1EG51BrIqhnJKW0LlcQxt0kwpp8O-MD1J,gdrive-connector\n"
            "how do I use python?,Standardize on uv,https://drive.google.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO,gdrive-connector\n"
        )
        res = self.client.post(
            "/api/upload/custom_dataset",
            files={"file": ("test_dataset.csv", csv_content.encode("utf-8"), "text/csv")},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertEqual(data.get("total_scenarios"), 2)
        scenarios = data.get("scenarios", [])
        self.assertEqual(scenarios[0]["query"], "how much is the wellness stipend?")
        self.assertEqual(scenarios[0]["expected_source"], ["https://drive.google.com/open?id=1EG51BrIqhnJKW0LlcQxt0kwpp8O-MD1J"])

    def test_api_upload_gdrive_dev_golden_dataset(self):
        golden_path = PATHS.get_dataset_path("google-team-gdrive_dev_golden.csv")
        self.assertTrue(golden_path.is_file())
        with open(golden_path, "rb") as f:
            res = self.client.post(
                "/api/upload/custom_dataset",
                files={"file": ("google-team-gdrive_dev_golden.csv", f.read(), "text/csv")},
            )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "success")
        self.assertGreater(data.get("total_scenarios"), 5)

    def test_api_save_dataset_rejects_non_url_source(self):
        payload = {
            "scenarios": [
                {
                    "query": "what is 1 + 1?",
                    "ground_truth": "2",
                    "expected_source": ["hello.txt"],
                }
            ]
        }
        res = self.client.post("/api/datasets/test_invalid_source_ds", json=payload)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid expected source", res.json().get("detail", ""))

    def test_api_upload_custom_dataset_rejects_non_url_source(self):
        csv_content = (
            "query,ground_truth,expected_source,connector_id\n"
            "what is 1 + 1?,2,hello.txt,gdrive-connector\n"
        )
        res = self.client.post(
            "/api/upload/custom_dataset",
            files={"file": ("test_invalid.csv", csv_content.encode("utf-8"), "text/csv")},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid expected source", res.json().get("detail", ""))

    def test_api_save_dataset_accepts_valid_url(self):
        payload = {
            "scenarios": [
                {
                    "query": "what is 1 + 1?",
                    "ground_truth": "2",
                    "expected_source": ["https://drive.google.com/file/d/1_inGi7qkJkJmNV7qpDUKPZq67limNS/view"],
                }
            ]
        }
        res = self.client.post("/api/datasets/test_valid_url_ds", json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json().get("status"), "success")

    def test_api_settings_sysinfo_includes_search_mode_and_company_name(self):
        res = self.client.get("/api/settings/sysinfo")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        env_vars = data.get("sysinfo", {}).get("env_variables", {})
        self.assertIn("SEARCH_MODE", env_vars)
        self.assertIn("COMPANY_NAME", env_vars)
        self.assertEqual(env_vars["COMPANY_NAME"], "Enterprise")

    def test_vector_search_mode_protocol_and_matrix_expansion(self):
        from ge_eval_harness.backend.config import ProtocolConfig, QueryScenarioConfig, expand_scenario_matrix

        cfg = ProtocolConfig(
            search_mode="Vector",
            company_name="Enterprise",
            models=["gemini-3.5-flash"],
            instruction_sets=["Default"],
        )
        scenarios = [QueryScenarioConfig(query="How do TLS certs work?", ground_truth="Handshake")]
        matrix = expand_scenario_matrix(cfg, scenarios)
        self.assertEqual(len(matrix), 1)
        self.assertEqual(matrix[0]["search_mode"], "Vector")
        self.assertEqual(matrix[0]["company_name"], "Enterprise")

    def test_agentic_search_mode_protocol_and_matrix_expansion(self):
        from ge_eval_harness.backend.config import ProtocolConfig, QueryScenarioConfig, expand_scenario_matrix

        cfg = ProtocolConfig(
            search_mode="Agentic",
            company_name="Enterprise",
            agent_ids=["core_assistant"],
            models=["gemini-3.5-flash"],
        )
        scenarios = [QueryScenarioConfig(query="How do TLS certs work?", ground_truth="Handshake")]
        matrix = expand_scenario_matrix(cfg, scenarios)
        self.assertEqual(len(matrix), 1)
        self.assertEqual(matrix[0]["search_mode"], "Agentic")
        self.assertEqual(matrix[0]["agent_id"], "core_assistant")

    def test_index_endpoint_renders_modular_html(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        html = res.text
        self.assertIn("harness-app", html)
        self.assertIn("screen-home", html)
        self.assertIn("screen-dataset-editor", html)
        self.assertIn("screen-run-config", html)
        self.assertIn("screen-run-status", html)
        self.assertIn("screen-datasets", html)
        self.assertIn("screen-results", html)
        self.assertIn("modal-request-trace-debug", html)
        self.assertIn("modal-run-selector", html)
        self.assertIn("/static/css/themes.css", html)
        self.assertIn("/static/js/trace-inspector.js", html)

    def test_static_modular_assets_accessible(self):
        assets = [
            "/static/css/themes.css",
            "/static/css/layout.css",
            "/static/css/components.css",
            "/static/css/trace-inspector.css",
            "/static/js/utils.js",
            "/static/js/theme.js",
            "/static/js/state.js",
            "/static/js/help-modal.js",
            "/static/js/run-browser.js",
            "/static/js/dataset-manager.js",
            "/static/js/results-view.js",
            "/static/js/run-status.js",
            "/static/js/trace-inspector.js",
        ]
        for asset in assets:
            res = self.client.get(asset)
            self.assertEqual(res.status_code, 200, f"Failed to retrieve asset {asset}")
            self.assertGreater(len(res.content), 0, f"Asset {asset} is empty")

    @classmethod
    def tearDownClass(cls):
        import shutil
        from ge_eval_harness.backend.app import RUNS_DIR, DATASETS_DIR
        if os.path.exists(RUNS_DIR):
            for d in os.listdir(RUNS_DIR):
                if d.startswith("run_") or d.startswith("test_"):
                    d_path = os.path.join(RUNS_DIR, d)
                    if os.path.isdir(d_path):
                        shutil.rmtree(d_path, ignore_errors=True)
        if os.path.exists(DATASETS_DIR):
            for f in os.listdir(DATASETS_DIR):
                if f.startswith("test_") or f.startswith("newdataset"):
                    f_path = os.path.join(DATASETS_DIR, f)
                    if os.path.isfile(f_path):
                        try:
                            os.remove(f_path)
                        except Exception:
                            pass

if __name__ == "__main__":
    unittest.main()
