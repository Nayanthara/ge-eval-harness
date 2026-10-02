"""
Canonical Constants and Environment Bootstrapping for Yahoo Gemini Enterprise Eval Harness.

Defines the single source of truth for static data schemas, and loads configuration
strictly from the repository root .env and .env.local files.
"""

import os
from typing import Dict, List, Optional
from dotenv import find_dotenv, load_dotenv

from .paths import REPO_ROOT as PATHS_REPO_ROOT

# --- Repository Root & Environment Bootstrapping ---
REPO_ROOT = str(PATHS_REPO_ROOT)

def bootstrap_environment(repo_root: Optional[str] = None) -> Dict[str, str]:
    """
    Loads .env and .env.local from the repository root.
    Returns a dictionary of all active target environment variables.
    """
    root = repo_root or REPO_ROOT
    env_local = os.path.join(root, ".env.local")
    env_file = os.path.join(root, ".env")

    # Load root .env files (env.local takes precedence)
    if os.path.exists(env_local):
        load_dotenv(env_local, override=True)
    elif find_dotenv(".env.local"):
        load_dotenv(find_dotenv(".env.local"), override=True)

    if os.path.exists(env_file):
        load_dotenv(env_file, override=False)
    elif find_dotenv(".env"):
        load_dotenv(find_dotenv(".env"), override=False)

    return {
        "PROJECT_ID": os.getenv("PROJECT_ID", ""),
        "GCP_PROJECT_NUMBER": os.getenv("GCP_PROJECT_NUMBER", ""),
        "ENGINE_ID": os.getenv("ENGINE_ID", ""),
        "LOCATION": os.getenv("LOCATION", "global"),
        "COLLECTION_ID": os.getenv("COLLECTION_ID", "default_collection"),
        "AGENT_ID": os.getenv("AGENT_ID", ""),
        "SEARCH_MODE": os.getenv("SEARCH_MODE", "Vector"),
        "COMPANY_NAME": os.getenv("COMPANY_NAME", "Yahoo"),
        "EVAL_HARNESS_PORT": os.getenv("EVAL_HARNESS_PORT", "8095"),
        "EVAL_HARNESS_OFFLINE": os.getenv("EVAL_HARNESS_OFFLINE", "true"),
        "CONNECTOR_COLLECTION_ID": os.getenv("CONNECTOR_COLLECTION_ID", ""),
        "CUSTOM_DOMAIN": os.getenv("CUSTOM_DOMAIN", ""),
        "LOCAL_TUNNELING_EVAL_PORT": os.getenv("LOCAL_TUNNELING_EVAL_PORT", "9225"),
    }


# Automatically bootstrap environment upon import
ACTIVE_ENV = bootstrap_environment()
SEARCH_MODE = ACTIVE_ENV.get("SEARCH_MODE", "Vector")
COMPANY_NAME = ACTIVE_ENV.get("COMPANY_NAME", "Yahoo")

# --- Canonical Dataset CSV Schema (6 Columns) ---
CANONICAL_DATASET_FIELDS = [
    "query",
    "ground_truth",
    "expected_source",
    "connector_id",
    "glean_response_text",
    "glean_source_urls",
]

# --- Schema File References ---
CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
MASTER_COMPARISON_SCHEMA_PATH = os.path.join(CONFIG_DIR, "master_comparison_schema.json")
