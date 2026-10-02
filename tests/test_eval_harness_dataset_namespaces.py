"""
Unit and integration tests for dataset namespace conventions (google-team- vs enterprise-team-),
physical CSV template availability, and data source scope isolation.
"""

import csv
import json
import os
import unittest
from unittest.mock import patch
import pytest

# Set TESTING env before importing app
os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
from ge_eval_harness.backend.app import app, DATASETS_DIR


@pytest.mark.quick
class TestEvalHarnessDatasetNamespaces(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_physical_template_file_exists_and_conforms_to_schema(self):
        """Verifies that dataset_import_template.csv exists on disk and has valid 6-column headers."""
        template_path = os.path.join(DATASETS_DIR, "dataset_import_template.csv")
        self.assertTrue(os.path.exists(template_path), f"Missing physical template at {template_path}")

        with open(template_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            expected_fields = ["query", "ground_truth", "expected_source", "connector_id", "glean_response_text", "glean_source_urls"]
            self.assertEqual(reader.fieldnames, expected_fields)

        # Also check sample template if present
        sample_path = os.path.join(DATASETS_DIR, "dataset_import_template_with_samples.csv")
        if os.path.exists(sample_path):
            with open(sample_path, mode="r", encoding="utf-8-sig") as sf:
                sreader = csv.DictReader(sf)
                self.assertEqual(sreader.fieldnames, expected_fields)
                srows = list(sreader)
                self.assertGreater(len(srows), 0, "Sample template should include example rows")

    def test_api_serves_physical_dataset_template(self):
        """Verifies GET /api/template/dataset returns the physical CSV template."""
        res = self.client.get("/api/template/dataset")
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/csv", res.headers.get("content-type", ""))
        self.assertIn("dataset_import_template.csv", res.headers.get("content-disposition", ""))
        self.assertIn("query,ground_truth,expected_source,connector_id", res.text)

    def test_datasets_directory_namespace_prefix_compliance(self):
        """
        Verifies EVERY dataset JSON in backend/datasets/ starts with either
        'google-team-' or 'enterprise-team-'.
        """
        dataset_files = [f for f in os.listdir(DATASETS_DIR) if f.endswith(".json")]
        self.assertGreater(len(dataset_files), 0)

        for fname in dataset_files:
            dataset_id = fname[:-5]
            is_valid_prefix = dataset_id.startswith("google-team-") or dataset_id.startswith("enterprise-team-")
            self.assertTrue(
                is_valid_prefix,
                f"Dataset '{fname}' violates namespace policy! Must start with 'google-team-' or 'enterprise-team-'."
            )

    def test_datasets_directory_csv_namespace_prefix_compliance(self):
        """
        Verifies dataset CSVs in backend/datasets/ start with 'google-team-' or 'enterprise-team-'
        (excluding templates and Glean comparison upload fixtures).
        """
        csv_files = [f for f in os.listdir(DATASETS_DIR) if f.endswith(".csv")]
        self.assertGreater(len(csv_files), 0)

        non_dataset_files = {
            "dataset_import_template.csv",
            "dataset_import_template_with_samples.csv",
        }

        for fname in csv_files:
            if fname in non_dataset_files:
                continue
            is_valid_prefix = fname.startswith("google-team-") or fname.startswith("enterprise-team-")
            self.assertTrue(
                is_valid_prefix,
                f"CSV dataset '{fname}' violates namespace policy! Must start with 'google-team-' or 'enterprise-team-'."
            )

    def test_every_json_dataset_has_matching_csv_pair(self):
        """
        Verifies that EVERY canonical .json dataset has an exact 1:1 matching .csv file with identical base name.
        """
        files = os.listdir(DATASETS_DIR)
        json_bases = {f[:-5] for f in files if f.endswith(".json")}
        csv_bases = {f[:-4] for f in files if f.endswith(".csv")}

        for base in json_bases:
            self.assertIn(
                base,
                csv_bases,
                f"Missing CSV counterpart '{base}.csv' for JSON dataset '{base}.json' in backend/datasets/!"
            )

    def test_datasource_scope_isolation_rules(self):
        """
        Verifies that:
        - All 'google-team-*' datasets strictly target Google Drive data sources.
        - All 'enterprise-team-*' datasets target enterprise connectors (Confluence, Jira, LumApps, etc.).
        """
        for fname in os.listdir(DATASETS_DIR):
            if not fname.endswith(".json"):
                continue
            with open(os.path.join(DATASETS_DIR, fname), "r", encoding="utf-8") as f:
                scenarios = json.load(f)

            if fname.startswith("google-team-"):
                for s in scenarios:
                    conn = s.get("connector_id", "")
                    self.assertTrue(
                        "gdrive" in conn or "google" in conn or conn == "all",
                        f"Google-team dataset '{fname}' contains non-Google connector: {conn}"
                    )
            elif fname.startswith("enterprise-team-"):
                connectors = set(s.get("connector_id", "") for s in scenarios)
                # Verify presence of enterprise connectors (Confluence, Jira, LumApps, SharePoint, Slack)
                has_enterprise_connector = any(
                    any(k in c.lower() for k in ["confluence", "jira", "lumapps", "slack", "sharepoint", "enterprise"])
                    for c in connectors
                )
                self.assertTrue(
                    has_enterprise_connector,
                    f"Enterprise-team dataset '{fname}' lacks enterprise connectors: {connectors}"
                )

    def test_api_list_and_get_datasets_by_namespace(self):
        """
        Verifies GET /api/datasets and GET /api/datasets/{id} return properly prefixed datasets.
        """
        res = self.client.get("/api/datasets")
        self.assertEqual(res.status_code, 200)
        datasets = res.json().get("datasets", [])

        dataset_ids = [d["dataset_id"] for d in datasets]
        self.assertIn("google-team-gdrive_dev_golden", dataset_ids)
        self.assertIn("enterprise-team-full_enterprise_golden", dataset_ids)

        # Test single get
        get_res = self.client.get("/api/datasets/google-team-gdrive_dev_golden")
        self.assertEqual(get_res.status_code, 200)
        scenarios = get_res.json().get("scenarios", [])
        self.assertEqual(len(scenarios), 14)

    @patch("ge_eval_harness.backend.services.unified_eval_service.run_concurrent_api_benchmarks")
    def test_run_benchmark_execution_with_namespaced_datasets(self, mock_benchmarks):
        """
        Verifies that POST /api/run_benchmark successfully loads and executes with the new names.
        """
        async def _mock_benchmarks(*args, **kwargs):
            scenarios = kwargs.get("scenarios", args[0] if args else [])
            return [
                {
                    "status_code": 200,
                    "response_text": "Sample mock answer.",
                    "ttft_sec": 0.3,
                    "ttlt_sec": 0.8,
                    "response_word_count": 3,
                    "generation_speed_tps": 5.0,
                    "trace_id": "00000000000000000000000000000001",
                    "span_id": "0000000000000001",
                    "source_urls": ["https://drive.google.com/open?id=10QsVyPIcWwMb8uK3_ylHqvxIkqtTMkQJ"],
                    "error_message": "",
                }
                for _ in scenarios
            ]
        mock_benchmarks.side_effect = _mock_benchmarks

        payload_google = {
            "dataset_key": "google-team-gdrive_dev_golden",
            "models": ["gemini-3.5-flash"],
            "iterations": 1,
            "max_concurrent_calls": 5,
            "use_fallback_judge": True,
        }
        res_g = self.client.post("/api/run_benchmark", json=payload_google)
        self.assertEqual(res_g.status_code, 200)
        self.assertEqual(res_g.json().get("records_count"), 14)

        # Legacy alias fallback verification
        payload_legacy = {
            "dataset_key": "gdrive_dev_golden",
            "models": ["gemini-3.5-flash"],
            "iterations": 1,
            "max_concurrent_calls": 5,
            "use_fallback_judge": True,
        }
        res_leg = self.client.post("/api/run_benchmark", json=payload_legacy)
        self.assertEqual(res_leg.status_code, 200)
        self.assertEqual(res_leg.json().get("records_count"), 14)


if __name__ == "__main__":
    unittest.main()
