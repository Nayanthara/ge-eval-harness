"""
Pydantic v2 Ingress Models & Dataset Manifest Schemas for Gemini Enterprise Eval Harness.
Enforces type safety, strict string trimming, and ingress token validation (CWE-022 / CWE-116).
"""

from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, field_validator


class DatasetCategory(str, Enum):
    CANONICAL_GOLDEN = "canonical_golden"
    SMOKE_TEST = "smoke_test"
    REGRESSION = "regression"
    PREFLIGHT = "preflight"
    CUSTOM = "custom"
    ARCHIVED = "archived"


class DatasetScope(str, Enum):
    GOOGLE_TEAM = "google-team"
    YAHOO_TEAM = "yahoo-team"
    CUSTOM = "custom"


class AddSourceRequest(BaseModel):
    """Payload for dynamically adding a verified reference URL to a golden scenario."""
    query: str = Field(..., min_length=1, description="Scenario query text to match")
    source_url: str = Field(..., min_length=1, description="Verified golden reference URL to append")
    dataset_key: str = Field(default="google-team-gdrive_dev_golden", pattern=r"^[a-zA-Z0-9_-]+$")
    run_id: Optional[str] = Field(default=None, pattern=r"^[a-zA-Z0-9_-]+$")

    @field_validator("query", "source_url", "dataset_key", mode="before")
    def strip_whitespace(cls, v: Any) -> str:
        return str(v).strip() if v is not None else ""


class ReplaceSourceRequest(BaseModel):
    """Payload for dynamically replacing a reference URL for a golden scenario."""
    query: str = Field(..., min_length=1, description="Scenario query text to match")
    new_source_url: str = Field(..., min_length=1, description="New verified golden reference URL")
    old_source_url: Optional[str] = Field(default="", description="Previous reference URL being replaced")
    dataset_key: str = Field(default="google-team-gdrive_dev_golden", pattern=r"^[a-zA-Z0-9_-]+$")
    run_id: Optional[str] = Field(default=None, pattern=r"^[a-zA-Z0-9_-]+$")

    @field_validator("query", "new_source_url", "dataset_key", mode="before")
    def strip_whitespace(cls, v: Any) -> str:
        return str(v).strip() if v is not None else ""


class ScenarioItem(BaseModel):
    """Represents a single evaluation query scenario in a dataset."""
    query: str = Field(..., min_length=1)
    ground_truth: str = Field(default="")
    expected_source: Union[str, List[str]] = Field(default_factory=list)
    connector_id: Optional[str] = Field(default="")
    glean_response_text: Optional[str] = Field(default="")
    glean_source_urls: Optional[str] = Field(default="")
    glean_latency_ttlt_sec: Optional[float] = Field(default=None)

    @field_validator("expected_source", mode="after")
    def normalize_sources(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if "|" in v:
                return [s.strip() for s in v.split("|") if s.strip()]
            return [v.strip()] if v.strip() else []
        return v
