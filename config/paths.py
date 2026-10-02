"""
Typed Path Configuration & Resolution for Gemini Enterprise Eval Harness.

Reads declarative directory mappings from paths.json relative to the eval_harness root.
Provides typed Path objects and lookup helpers for datasets, runs, analysis, and templates.
"""

import json
import os
from pathlib import Path
from typing import Optional

# Determine eval_harness root from this file location: config/paths.py -> eval_harness root (2 levels up)
_this_dir = Path(__file__).resolve().parent
HARNESS_ROOT = _this_dir.parent
REPO_ROOT = Path(os.environ.get("GE_EVAL_HARNESS_ROOT", os.environ.get("EVAL_HARNESS_ROOT", str(HARNESS_ROOT)))).resolve()
DEFAULT_CONFIG_PATH = _this_dir / "paths.json"


class PathConfig:
    """Encapsulates canonical repository and eval harness directory paths."""

    def __init__(self, config_file: Optional[Path] = None):
        cfg_path = config_file or DEFAULT_CONFIG_PATH
        if cfg_path.is_file():
            with cfg_path.open("r", encoding="utf-8") as f:
                cfg = json.load(f)
        else:
            cfg = {}

        self.repo_root: Path = REPO_ROOT

        def _resolve_dir(key: str, default: str) -> Path:
            rel = cfg.get(key, default)
            if rel.startswith("tools/eval_harness/"):
                rel = rel[len("tools/eval_harness/"):]
            elif rel.startswith("tools/ge_eval_harness/"):
                rel = rel[len("tools/ge_eval_harness/"):]
            return (self.repo_root / rel).resolve()

        self.data_dir: Path = _resolve_dir("base_data_dir", "backend/data")
        self.datasets_dir: Path = _resolve_dir("datasets_dir", "backend/data/datasets")
        self.runs_dir: Path = _resolve_dir("runs_dir", "backend/data/runs")
        self.analysis_dir: Path = _resolve_dir("analysis_dir", "backend/data/analysis")
        self.logs_dir: Path = _resolve_dir("logs_dir", "backend/data/logs")
        self.static_dir: Path = _resolve_dir("static_dir", "backend/static")
        self.templates_dir: Path = _resolve_dir("templates_dir", "backend/templates")
        self.master_comparison_csv: Path = (self.analysis_dir / "wellness_stipend_master_comparison.csv").resolve()
        self.dataset_import_template_csv: Path = (self.datasets_dir / "dataset_import_template.csv").resolve()
        self.dataset_import_template_with_samples_csv: Path = (self.datasets_dir / "dataset_import_template_with_samples.csv").resolve()

    def get_dataset_path(self, filename: str) -> Path:
        """Returns the absolute Path to a dataset file in the datasets directory, checking archive/ if needed."""
        direct = (self.datasets_dir / filename).resolve()
        if not direct.exists():
            archive = (self.datasets_dir / "archive" / filename).resolve()
            if archive.exists():
                return archive
        return direct

    def get_run_path(self, run_id: str) -> Path:
        """Returns the absolute Path to a run directory in the runs directory."""
        return (self.runs_dir / run_id).resolve()


PATHS = PathConfig()
