#!/usr/bin/env python3
"""
Google Cloud Application Default Credentials (ADC) and Token Management.
"""

import os
from typing import Any, Tuple
import google.auth
from google.auth.transport.requests import Request

ADC_AUTH_ERROR_MESSAGE = (
    "🚨 GOOGLE CLOUD ADC AUTHENTICATION ERROR!\n"
    "================================================================================\n"
    "Your Google Cloud Application Default Credentials (ADC) are missing, expired, or invalid.\n\n"
    "To reauthenticate, please follow Step 2 in README.md:\n\n"
    "    gcloud auth application-default login\n"
    "    gcloud config set project <YOUR_YAHOO_GCP_PROJECT_ID>\n\n"
    "Ensure your user account has 'roles/discoveryengine.viewer' and\n"
    "'roles/serviceusage.serviceUsageConsumer' on the target project.\n"
    "================================================================================"
)


def get_gcp_credentials() -> Tuple[Any, str]:
    """
    Fetches and refreshes Google Application Default Credentials (ADC).
    Fails loudly with actionable instructions referencing README.md if ADC is invalid.
    Supports mock ADC bypass when TESTING or MOCK_ADC is enabled.
    """
    if os.environ.get("TESTING") == "true" or os.environ.get("MOCK_ADC") == "true":
        try:
            credentials, project = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            if credentials.valid and getattr(credentials, "token", None):
                return credentials, project
        except Exception:
            pass

        mock_project = os.environ.get("PROJECT_ID", os.environ.get("GCP_PROJECT", "mock-gcp-project"))

        class MockCredentials:
            valid = True
            token = "mock-token-xyz"
            service_account_email = f"test-sa@{mock_project}.iam.gserviceaccount.com"
            signer_email = f"test-sa@{mock_project}.iam.gserviceaccount.com"

            def refresh(self, request):
                pass

        return MockCredentials(), mock_project

    try:
        credentials, project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        if not credentials.valid or not getattr(credentials, "token", None):
            credentials.refresh(Request())
        return credentials, project
    except Exception as exc:
        print(f"\n{ADC_AUTH_ERROR_MESSAGE}\nUnderlying Error: {exc}\n", flush=True)
        raise RuntimeError(f"{ADC_AUTH_ERROR_MESSAGE}\n\n[Underlying Error]: {exc}") from exc


def get_adc_user_identity() -> Tuple[str, str]:
    """
    Safely retrieves the active ADC user / service account email and domain without throwing.
    Returns (account_email, domain).
    """
    account = os.environ.get("ADC_ACCOUNT", "")
    if not account:
        try:
            import subprocess
            res = subprocess.run(["gcloud", "config", "get-value", "account"], capture_output=True, text=True, timeout=2)
            if res.returncode == 0 and res.stdout.strip():
                account = res.stdout.strip()
        except Exception:
            pass
    if not account:
        try:
            creds, _ = get_gcp_credentials()
            account = getattr(creds, "service_account_email", "") or getattr(creds, "signer_email", "") or getattr(creds, "_service_account_email", "")
        except Exception:
            pass
    if not account:
        account = os.environ.get("USER", "developer") + "@local"

    domain = account.split("@")[-1] if "@" in account else "unknown"
    return account, domain

