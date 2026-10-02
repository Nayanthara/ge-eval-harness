"""
Fast, Mocked Unit Tests for Eval Harness Preflight Diagnostic Verifier (cli/preflight_check.py).
Asserts all branches (ADC, Chrome CDP, Console Session, Target Environment, and Main execution) with 0 network latency.
"""

import os
import unittest
from unittest.mock import MagicMock, patch
import httpx

from ge_eval_harness.cli.preflight_check import (
    check_chrome_cdp_connection,
    check_chrome_session_auth,
    check_environment_parameters,
    check_gcloud_adc,
    load_env_file,
    main as preflight_main,
)


class TestEvalHarnessPreflight(unittest.TestCase):

    def test_load_env_file(self):
        env_dict = load_env_file()
        self.assertIsInstance(env_dict, dict)
        self.assertIn("PROJECT_ID", env_dict)

    @patch("google.auth.default")
    @patch("httpx.get")
    def test_check_gcloud_adc_success(self, mock_get, mock_auth):
        mock_creds = MagicMock()
        mock_creds.token = "valid-token-123"
        mock_auth.return_value = (mock_creds, "genai-alpha-422116")
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"email": "test@example.com"})

        ok, creds, email = check_gcloud_adc()
        self.assertTrue(ok)
        self.assertEqual(creds, mock_creds)
        self.assertEqual(email, "test@example.com")

    @patch("google.auth.default", side_effect=Exception("No ADC found"))
    def test_check_gcloud_adc_failure(self, mock_auth):
        ok, creds, email = check_gcloud_adc()
        self.assertFalse(ok)
        self.assertIsNone(creds)
        self.assertIsNone(email)

    @patch("httpx.get")
    def test_check_chrome_cdp_connection_success(self, mock_get):
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"Browser": "Chrome/120.0"})
        ok = check_chrome_cdp_connection(cdp_port=9225)
        self.assertTrue(ok)

    @patch("httpx.get", side_effect=httpx.ConnectError("Connection refused"))
    def test_check_chrome_cdp_connection_refused(self, mock_get):
        ok = check_chrome_cdp_connection(cdp_port=9225)
        self.assertFalse(ok)

    @patch("httpx.get")
    def test_check_chrome_session_auth_detected(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: [{"url": "https://console.cloud.google.com/gemini-enterprise/locations/global"}]
        )
        ok = check_chrome_session_auth(adc_email="test@example.com", cdp_port=9225)
        self.assertTrue(ok)

    @patch("httpx.get")
    def test_check_chrome_session_auth_missing(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: [{"url": "https://google.com"}]
        )
        ok = check_chrome_session_auth(adc_email="test@example.com", cdp_port=9225)
        self.assertFalse(ok)

    @patch.dict(os.environ, {"PROJECT_ID": "genai-alpha-422116", "ENGINE_ID": "enterprise_engine_1780365163254", "LOCATION": "global"})
    @patch("httpx.get")
    def test_check_environment_parameters_success_with_reused_creds(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"dataStoreIds": ["ds_1", "ds_2"]}
        )
        mock_creds = MagicMock(token="mock-token-xyz")
        ok = check_environment_parameters(credentials=mock_creds, adc_email="test@example.com")
        self.assertTrue(ok)

    @patch.dict(os.environ, {"PROJECT_ID": "", "ENGINE_ID": ""})
    def test_check_environment_parameters_missing_required(self):
        ok = check_environment_parameters()
        self.assertFalse(ok)

    @patch.dict(os.environ, {"EVAL_HARNESS_OFFLINE": "true", "PROJECT_ID": "genai-alpha-422116", "ENGINE_ID": "enterprise_engine_1780365163254"})
    @patch("ge_eval_harness.cli.preflight_check.check_gcloud_adc")
    @patch("ge_eval_harness.cli.preflight_check.check_environment_parameters")
    def test_preflight_main_offline_mode_success(self, mock_env_check, mock_adc_check):
        mock_creds = MagicMock()
        mock_adc_check.return_value = (True, mock_creds, "test@example.com")
        mock_env_check.return_value = True

        # Should execute without calling sys.exit
        preflight_main()
        mock_adc_check.assert_called_once()
        mock_env_check.assert_called_once_with(credentials=mock_creds, adc_email="test@example.com")


if __name__ == "__main__":
    unittest.main()
