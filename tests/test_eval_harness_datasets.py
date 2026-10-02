import json
import os
import shutil
import tempfile
import unittest
import pytest

# Set TESTING env before importing app
os.environ["TESTING"] = "true"

from fastapi.testclient import TestClient
import ge_eval_harness.backend.app as app_module
from ge_eval_harness.backend.app import app
from ge_eval_harness.config.paths import PATHS

@pytest.mark.quick
class TestEvalHarnessDatasetsAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        # Override DATASETS_DIR to a temporary folder
        self.temp_dir = tempfile.mkdtemp()
        self.original_datasets_dir = app_module.DATASETS_DIR
        app_module.DATASETS_DIR = self.temp_dir
        
    def tearDown(self):
        # Restore original DATASETS_DIR
        app_module.DATASETS_DIR = self.original_datasets_dir
        shutil.rmtree(self.temp_dir)

    def test_datasets_crud_lifecycle(self):
        # 1. List initially empty
        res = self.client.get("/api/datasets")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["datasets"]), 0)

        # 2. Create new dataset
        payload = {
            "scenarios": [
                {
                    "query": "how much is the wellness stipend?",
                    "ground_truth": "$150 per month",
                    "expected_source": ["https://drive.google.com/file/123/view"],
                    "connector_id": "gdrive-connector",
                    "glean_response_text": "Glean wellness stipend: $150",
                    "glean_source_urls": "https://drive.google.com/file/123/view"
                }
            ]
        }
        res = self.client.post("/api/datasets/my_test_dataset", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")

        # 3. Get dataset details
        res = self.client.get("/api/datasets/my_test_dataset")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(len(data["scenarios"]), 1)
        self.assertEqual(data["scenarios"][0]["query"], "how much is the wellness stipend?")

        # 4. List now has 1 dataset
        res = self.client.get("/api/datasets")
        data = res.json()
        self.assertEqual(len(data["datasets"]), 1)
        self.assertEqual(data["datasets"][0]["dataset_id"], "my_test_dataset")
        self.assertEqual(data["datasets"][0]["scenarios_count"], 1)

        # 5. Delete dataset
        res = self.client.delete("/api/datasets/my_test_dataset")
        self.assertEqual(res.status_code, 200)
        
        # 6. List empty again
        res = self.client.get("/api/datasets")
        data = res.json()
        self.assertEqual(len(data["datasets"]), 0)

    def test_template_schema_download_and_upload_validation(self):
        """
        Validates:
        1. GET /api/template/dataset returns canonical 6-column CSV schema from dataset_import_template.csv.
        2. google-team-five_samples_multi_datasource-template-test.csv matches template headers and parses via /api/upload/custom_dataset.
        3. Saving to /api/datasets/google-team-five_samples_multi_datasource-template-test creates an identical dataset to google-team-five_samples_multi_datasource.
        4. Running /api/run_benchmark against the new dataset executes 5 evaluation requests successfully.
        """
        # 1. Verify Download CSV Template endpoint schema (blank template, 0 rows)
        res_template = self.client.get("/api/template/dataset")
        self.assertEqual(res_template.status_code, 200)
        self.assertIn("text/csv", res_template.headers.get("content-type", ""))
        lines = [line.strip() for line in res_template.text.strip().split("\n") if line.strip()]
        expected_header = "query,ground_truth,expected_source,connector_id,glean_response_text,glean_source_urls"
        self.assertEqual(lines[0], expected_header, "Template CSV headers must match canonical dataset schema")
        self.assertEqual(len(lines), 1, "Blank template must only contain the header row")

        # 1b. Verify Download CSV Template with Samples endpoint (3 sample rows)
        res_samples = self.client.get("/api/template/dataset/samples")
        self.assertEqual(res_samples.status_code, 200)
        sample_lines = [line.strip() for line in res_samples.text.strip().split("\n") if line.strip()]
        self.assertEqual(len(sample_lines), 4, "Sample template must contain header + 3 rows")

        # 2. Load the canonical CSV from PATHS
        csv_file_path = PATHS.get_dataset_path("google-team-five_samples_multi_datasource.csv")
        self.assertTrue(csv_file_path.exists(), f"CSV not found at {csv_file_path}")
        with open(csv_file_path, "rb") as f:
            csv_bytes = f.read()

        # 3. Upload via custom dataset upload API
        upload_res = self.client.post(
            "/api/upload/custom_dataset",
            files={"file": ("google-team-five_samples_multi_datasource.csv", csv_bytes, "text/csv")}
        )
        self.assertEqual(upload_res.status_code, 200)
        upload_data = upload_res.json()
        self.assertEqual(upload_data.get("status"), "success")
        self.assertEqual(upload_data.get("total_scenarios"), 5)
        uploaded_scenarios = upload_data.get("scenarios", [])

        # 4. Save to datasets collection as a template test dataset
        dataset_id = "google-team-five_samples_multi_datasource-template-test"
        save_res = self.client.post(f"/api/datasets/{dataset_id}", json={"scenarios": uploaded_scenarios})
        self.assertEqual(save_res.status_code, 200)
        save_data = save_res.json()
        self.assertEqual(save_data.get("status"), "success")
        self.assertEqual(save_data.get("scenarios_count"), 5)

        # 5. Validate new dataset is identical to google-team-five_samples_multi_datasource
        golden_json_path = PATHS.get_dataset_path("google-team-five_samples_multi_datasource.json")
        with open(golden_json_path, "r", encoding="utf-8") as f:
            golden_scenarios = json.load(f)

        get_res = self.client.get(f"/api/datasets/{dataset_id}")
        self.assertEqual(get_res.status_code, 200)
        saved_scenarios = get_res.json().get("scenarios", [])

        self.assertEqual(len(saved_scenarios), len(golden_scenarios))
        for i in range(len(golden_scenarios)):
            g = golden_scenarios[i]
            s = saved_scenarios[i]
            self.assertEqual(s["query"], g["query"], f"Mismatch in query at index {i}")
            self.assertEqual(s["ground_truth"], g["ground_truth"], f"Mismatch in ground_truth at index {i}")
            self.assertEqual(s["expected_source"], g["expected_source"], f"Mismatch in expected_source at index {i}")
            self.assertEqual(s["connector_id"], g["connector_id"], f"Mismatch in connector_id at index {i}")

        # 6. Execute full evaluation with the new dataset
        eval_payload = {
            "dataset_key": dataset_id,
            "models": ["gemini-3.5-flash"],
            "iterations": 1,
            "max_concurrent_calls": 5,
            "use_fallback_judge": True,
        }
        eval_res = self.client.post("/api/run_benchmark", json=eval_payload)
        self.assertEqual(eval_res.status_code, 200)
        eval_data = eval_res.json()
        self.assertEqual(eval_data.get("status"), "success")
        self.assertEqual(eval_data.get("records_count"), 5)
        self.assertIn("latency_summary", eval_data)

        # 7. Cleanup temporary test dataset
        self.client.delete(f"/api/datasets/{dataset_id}")

if __name__ == "__main__":
    unittest.main()
