"""
Unit Tests for Evaluation Harness Configuration Architecture & Root .env Environment Resolution.
"""

import os
import unittest
from pathlib import Path
from ge_eval_harness.config import (
    ACTIVE_ENV,
    CANONICAL_DATASET_FIELDS,
    CONFIG_DIR,
    MASTER_COMPARISON_SCHEMA_PATH,
    REPO_ROOT,
    bootstrap_environment,
)
import importlib.util
from ge_eval_harness.cli.preflight_check import load_env_file, check_environment_parameters


def _get_slack_preflight_module():
    slack_preflight_path = os.path.join(
        REPO_ROOT, "slack", "bot", "preflight_check.py"
    )
    if not os.path.exists(slack_preflight_path):
        return None
    spec = importlib.util.spec_from_file_location("slack_preflight_check", slack_preflight_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class TestEvalHarnessConfigAndEnv(unittest.TestCase):

    def test_repo_root_and_config_dir_paths(self):
        self.assertTrue(os.path.exists(REPO_ROOT), f"REPO_ROOT does not exist: {REPO_ROOT}")
        self.assertTrue(os.path.exists(CONFIG_DIR), f"CONFIG_DIR does not exist: {CONFIG_DIR}")
        self.assertTrue(os.path.exists(MASTER_COMPARISON_SCHEMA_PATH), "master_comparison_schema.json missing")

    def test_canonical_dataset_fields(self):
        expected_fields = [
            "query",
            "ground_truth",
            "expected_source",
            "connector_id",
            "glean_response_text",
            "glean_source_urls",
        ]
        self.assertEqual(CANONICAL_DATASET_FIELDS, expected_fields)
        self.assertEqual(len(CANONICAL_DATASET_FIELDS), 6)

    def test_bootstrap_environment_loads_root_env(self):
        env_dict = bootstrap_environment()
        self.assertIsInstance(env_dict, dict)
        self.assertIn("PROJECT_ID", env_dict)
        self.assertIn("ENGINE_ID", env_dict)
        self.assertIn("LOCATION", env_dict)
        self.assertIn("COLLECTION_ID", env_dict)
        self.assertIn("EVAL_HARNESS_PORT", env_dict)
        # Should match os.getenv
        self.assertEqual(env_dict["PROJECT_ID"], os.getenv("PROJECT_ID", ""))
        self.assertEqual(env_dict["ENGINE_ID"], os.getenv("ENGINE_ID", ""))

    def test_preflight_check_eval_harness_loader(self):
        env_loaded = load_env_file()
        self.assertIsInstance(env_loaded, dict)
        self.assertEqual(env_loaded["PROJECT_ID"], os.getenv("PROJECT_ID", ""))

    def test_preflight_check_slack_oauth_loader(self):
        slack_mod = _get_slack_preflight_module()
        if not slack_mod:
            self.skipTest("Standalone eval_harness does not bundle slack bot preflight")
        slack_env = slack_mod.load_environment()
        self.assertIsInstance(slack_env, dict)
        self.assertIn("PROJECT_ID", slack_env)
        self.assertIn("ENGINE_ID", slack_env)
        self.assertIn("CUSTOM_DOMAIN", slack_env)

    def test_backend_services_environment_import_cleanliness(self):
        from ge_eval_harness.backend.services.discovery_inspector import DiscoveryInspector
        from ge_eval_harness.backend.services.latency_engine import calculate_latency_stats
        from ge_eval_harness.backend.services.bigquery_analytics import export_records_to_bigquery
        from ge_eval_harness.backend.services.glean_eval_service import MASTER_COMPARISON_FIELDNAMES

        inspector = DiscoveryInspector()
        self.assertEqual(inspector.project_id, os.getenv("PROJECT_ID", ""))
        self.assertEqual(inspector.location, os.getenv("LOCATION", "global"))

        stats = calculate_latency_stats([1.0, 2.0, 3.0])
        self.assertEqual(stats["p50"], 2.0)

        self.assertEqual(len(MASTER_COMPARISON_FIELDNAMES), 27)


if __name__ == "__main__":
    unittest.main()
