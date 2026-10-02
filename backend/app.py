#!/usr/bin/env python3
"""
Yahoo Gemini Enterprise & Glean Evaluation Studio Web GUI (FastAPI version).
Serves an interactive web dashboard and API endpoints for executing e2e evaluation benchmarks.
"""

import asyncio
import csv
from datetime import datetime
import io
import json
import logging
import os
import secrets
import subprocess
import sys
import time
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv, find_dotenv

# Ensure package parent and eval_harness root are in sys.path when executed directly
_HARNESS_ROOT = Path(__file__).resolve().parent.parent
for _p in [str(_HARNESS_ROOT.parent), str(_HARNESS_ROOT)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from ge_eval_harness.config import (
    CANONICAL_DATASET_FIELDS,
    bootstrap_environment,
    ACTIVE_ENV,
)

# Load environment configuration from repository root
bootstrap_environment()

from fastapi import FastAPI, Request, Response, HTTPException, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.base import BaseHTTPMiddleware

from ge_eval_harness.backend.security import SafePathResolver, strip_html_tags

from ge_eval_harness.backend.services.glean_eval_service import (
    generate_glean_template_csv,
    merge_master_comparison_csv,
    parse_glean_csv_and_evaluate,
    process_uploaded_master_csv,
    MASTER_COMPARISON_FIELDNAMES,
)
from ge_eval_harness.backend.config import (
    ProtocolConfig,
    QueryScenarioConfig,
)
from ge_eval_harness.backend.services.unified_eval_service import (
    execute_unified_evaluation,
    log_run_event,
    get_run_events,
    cleanup_stale_cached_runs,
)
from ge_eval_harness.backend.services.discovery_inspector import (
    inspect_collections,
    generate_w3c_traceparent,
)
from ge_eval_harness.backend.services.browser_ui_service import (
    record_ui_session,
)
from ge_eval_harness.backend.services.bigquery_analytics import (
    export_records_to_bigquery,
    export_dataset_to_bigquery,
)
from ge_eval_harness.backend.services.citation_matcher import (
    is_valid_source_identifier,
)
from ge_eval_harness.backend.services.latency_engine import (
    calculate_latency_stats,
)

logger = logging.getLogger("ge_eval_harness.app")

app = FastAPI(title="Yahoo Gemini Enterprise Eval Harness")

ACTIVE_RUN_TASKS: Dict[str, asyncio.Task] = {}

class CSRFSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Retrieve CSRF token from request cookies
        session_token = request.cookies.get("session_csrf_token")
        
        # If there's no session CSRF token, generate one
        if not session_token:
            session_token = secrets.token_hex(32)
            
        # CSRF check on state-modifying requests (POST/PUT/DELETE)
        if request.method in ["POST", "PUT", "DELETE"]:
            # Skip check on documentation or testing paths, or programmatic API clients without browser session cookies
            has_session_cookie = "session_csrf_token" in request.cookies
            if os.getenv("TESTING") != "true" and has_session_cookie and not request.url.path.startswith("/docs") and not request.url.path.startswith("/openapi.json"):
                sent_token = request.headers.get("X-XSRF-TOKEN")
                
                # Check JSON payload if headers didn't contain the token
                if not sent_token:
                    try:
                        body_json = await request.json()
                        sent_token = body_json.get("csrf_token")
                    except Exception:
                        pass
                
                if not sent_token or sent_token != session_token:
                    return JSONResponse(
                        {"error": "XSRF token validation failed. Request blocked."}, 
                        status_code=403
                    )
        
        # Proceed with request
        response = await call_next(request)
        
        # Set security headers
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            
        # Set CSRF cookie (XSRF-TOKEN is read by the frontend client)
        response.set_cookie(
            "XSRF-TOKEN",
            session_token,
            samesite="lax",
            secure=False,
            httponly=False
        )
        
        # Save session token in a separate HttpOnly cookie for server validation
        response.set_cookie(
            "session_csrf_token",
            session_token,
            samesite="lax",
            secure=False,
            httponly=True
        )
        return response

app.add_middleware(CSRFSecurityMiddleware)

@app.middleware("http")
async def add_no_cache_header(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/") or request.url.path == "/":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

from ge_eval_harness.config.paths import PATHS

BASE_DIR = str(PATHS.static_dir.parent)
DATA_DIR = str(PATHS.data_dir)
DATASETS_DIR = str(PATHS.datasets_dir)
ANALYSIS_DIR = str(PATHS.analysis_dir)
RUNS_DIR = str(PATHS.runs_dir)
LOGS_DIR = str(PATHS.logs_dir)

GE_RESULTS_PATH = str(PATHS.analysis_dir / "wellness_stipend_eval_smoke_test_judge.csv")
MASTER_COMPARISON_PATH = str(PATHS.master_comparison_csv)

import re
from pathlib import Path

class DatasetRegistry:
    """Encapsulates dataset storage, lookup, and scenario loading using in-memory index mapping."""
    @property
    def directory(self) -> Path:
        return Path(DATASETS_DIR).resolve()

    def _get_json_index(self) -> dict[str, Path]:
        index: dict[str, Path] = {}
        if self.directory.is_dir():
            for p in self.directory.glob("*.json"):
                index[p.stem] = p
                for prefix in ("google-team-", "yahoo-team-"):
                    if p.stem.startswith(prefix):
                        index[p.stem[len(prefix):]] = p
            archive_dir = self.directory / "archive"
            if archive_dir.is_dir():
                for p in archive_dir.glob("*.json"):
                    if p.stem not in index:
                        index[p.stem] = p
                    for prefix in ("google-team-", "yahoo-team-"):
                        if p.stem.startswith(prefix) and p.stem[len(prefix):] not in index:
                            index[p.stem[len(prefix):]] = p
        return index

    def _get_csv_index(self) -> dict[str, Path]:
        index: dict[str, Path] = {}
        if self.directory.is_dir():
            for p in self.directory.glob("*.csv"):
                index[p.stem] = p
                for prefix in ("google-team-", "yahoo-team-"):
                    if p.stem.startswith(prefix):
                        index[p.stem[len(prefix):]] = p
            archive_dir = self.directory / "archive"
            if archive_dir.is_dir():
                for p in archive_dir.glob("*.csv"):
                    if p.stem not in index:
                        index[p.stem] = p
                    for prefix in ("google-team-", "yahoo-team-"):
                        if p.stem.startswith(prefix) and p.stem[len(prefix):] not in index:
                            index[p.stem[len(prefix):]] = p
        return index

    def get_path(self, key: str) -> Optional[str]:
        clean_key = Path(key).name.strip()
        p = self._get_json_index().get(clean_key)
        return str(p) if p and p.is_file() else None

    def get_json_path(self, key: str) -> Optional[str]:
        clean_key = Path(key).name.strip()
        p = self._get_json_index().get(clean_key)
        return str(p) if p and p.is_file() else None

    def get_csv_path(self, key: str) -> Optional[str]:
        clean_key = Path(key).name.strip()
        p = self._get_csv_index().get(clean_key)
        return str(p) if p and p.is_file() else None

    def load_scenarios(self, key: str) -> Optional[list[dict]]:
        clean_key = Path(key).name.strip()
        p = self._get_json_index().get(clean_key)
        if not p or not p.is_file():
            return None
        try:
            with p.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def load_csv_rows(self, key: str) -> Optional[list[dict]]:
        clean_key = Path(key).name.strip()
        p = self._get_csv_index().get(clean_key)
        if not p or not p.is_file():
            return None
        return _read_csv_rows(str(p))

    def list_datasets(self) -> list[dict]:
        datasets = []
        if self.directory.is_dir():
            for p in sorted(self.directory.glob("*.json")):
                try:
                    with p.open("r", encoding="utf-8") as file:
                        data = json.load(file)
                        scenarios_count = len(data) if isinstance(data, list) else 0
                        preview_queries = [s.get("query", "") for s in data[:2]] if isinstance(data, list) else []
                        connectors = list(set([s.get("connector_id", "") for s in data if s.get("connector_id")])) if isinstance(data, list) else []
                    datasets.append({
                        "id": p.stem,
                        "dataset_id": p.stem,
                        "name": p.stem,
                        "scenarios_count": scenarios_count,
                        "count": scenarios_count,
                        "preview_queries": preview_queries,
                        "connectors": connectors,
                    })
                except Exception:
                    pass
        return datasets

    def save_dataset(self, key: str, scenarios: list[dict]) -> str:
        clean_key = re.sub(r"[^a-zA-Z0-9_-]", "", Path(key).stem).strip()
        if not clean_key:
            raise HTTPException(status_code=400, detail="Invalid dataset identifier.")
        target = (self.directory / f"{clean_key}.json").resolve()
        if not target.is_relative_to(self.directory):
            raise HTTPException(status_code=400, detail="Invalid dataset identifier.")
        self.directory.mkdir(parents=True, exist_ok=True)
        with target.open("w", encoding="utf-8") as f:
            json.dump(scenarios, f, indent=2)
        return str(target)

    def delete_dataset(self, key: str) -> bool:
        clean_key = Path(key).name.strip()
        p = self._get_json_index().get(clean_key)
        if p and p.is_file():
            p.unlink()
            return True
        return False


class RunRepository:
    """Encapsulates run artifact discovery, metadata caching, and event logging."""
    def __init__(self):
        self._metadata_cache: dict[str, dict] = {}

    @property
    def directory(self) -> Path:
        return Path(RUNS_DIR).resolve()

    def _get_run_index(self) -> dict[str, Path]:
        index: dict[str, Path] = {}
        if self.directory.is_dir():
            for p in self.directory.iterdir():
                if p.is_dir():
                    index[p.name] = p
        return index

    def get_run_folder(self, run_id: str) -> Optional[str]:
        clean_id = Path(run_id).name.strip()
        p = self._get_run_index().get(clean_id)
        return str(p) if p and p.is_dir() else None

    def get_run_metadata(self, run_id: str, d_path: Path) -> dict:
        """Parses metadata for a single run folder from disk."""
        scenarios_count = 0
        for mf in d_path.glob("manifest*.json"):
            try:
                with mf.open("r", encoding="utf-8") as f:
                    scenarios_count = len(json.load(f))
                    break
            except Exception:
                pass

        results_file = d_path / "results.json"
        has_results = False
        accuracy_rate = None
        avg_ttlt = None
        if results_file.is_file():
            try:
                with results_file.open("r", encoding="utf-8") as f:
                    rows = json.load(f)
                if isinstance(rows, list) and len(rows) > 0:
                    has_results = True
                    gemini_rows = [r for r in rows if r.get("system") != "Glean_Web" and r.get("model_id") != "glean-default"]
                    scenarios_count = len(gemini_rows) or len(rows)
                    valid_judges = [r for r in gemini_rows if r.get("judge_pass") is not None or r.get("accuracy_pass") is not None]
                    if valid_judges:
                        passes = sum(1 for r in valid_judges if r.get("judge_pass") is True or r.get("accuracy_pass") is True)
                        accuracy_rate = round((passes / len(valid_judges)) * 100, 1)
                    valid_ttlt = [float(r.get("ttlt_sec", 0)) for r in gemini_rows if r.get("ttlt_sec")]
                    if valid_ttlt:
                        avg_ttlt = round(sum(valid_ttlt) / len(valid_ttlt), 2)
            except Exception:
                pass

        models = ["gemini-3.5-flash"]
        system_instruction_mode = "Default"
        dataset_key = "custom_uploaded"
        iterations = 1
        concurrency = 3
        config_file = d_path / "run_config.json"
        if not config_file.is_file():
            config_file = d_path / "config.json"
        if config_file.is_file():
            try:
                with config_file.open("r", encoding="utf-8") as f:
                    cfg = json.load(f)
                if cfg.get("models"):
                    models = cfg.get("models")
                if cfg.get("custom_system_instruction") or "Custom" in cfg.get("instruction_sets", []):
                    system_instruction_mode = "Custom"
                if cfg.get("dataset_key") or cfg.get("dataset_name") or cfg.get("dataset_id"):
                    dataset_key = cfg.get("dataset_key") or cfg.get("dataset_name") or cfg.get("dataset_id")
                if cfg.get("iterations"):
                    iterations = int(cfg.get("iterations"))
                if cfg.get("max_concurrent_calls"):
                    concurrency = int(cfg.get("max_concurrent_calls"))
            except Exception:
                pass

        status = "running"
        events_file = d_path / "events_log.json"
        has_persistence = False
        if events_file.is_file():
            try:
                with events_file.open("r", encoding="utf-8") as f:
                    evs = json.load(f)
                if isinstance(evs, list) and evs:
                    last_ev = evs[-1]
                    last_st = str(last_ev.get("status", "")).lower()
                    last_step = str(last_ev.get("step", "")).lower()
                    has_persistence = any(
                        ev.get("step") == "Persistence" and str(ev.get("status", "")).lower() in ("completed", "done")
                        for ev in evs if isinstance(ev, dict)
                    )
                    if "fail" in last_st or "error" in last_st or "error" in last_step:
                        status = "failed"
                    elif "cancel" in last_st:
                        status = "cancelled"
                    elif has_persistence or has_results:
                        status = "completed"
                    elif last_st == "running":
                        mtime = events_file.stat().st_mtime
                        if (time.time() - mtime) > 600:
                            status = "failed"
                        else:
                            status = "running"
            except Exception:
                pass

        if not events_file.is_file():
            if has_results:
                status = "completed"
            else:
                try:
                    mtime = d_path.stat().st_mtime
                    if (time.time() - mtime) > 600:
                        status = "failed"
                    else:
                        status = "running"
                except Exception:
                    status = "failed"

        timestamp = ""
        time_str = run_id[4:] if run_id.startswith("run_") else run_id
        time_str = time_str.replace("_", "")
        if len(time_str) >= 14 and time_str[:14].isdigit():
            t_sub = time_str[:14]
            timestamp = f"{t_sub[:4]}-{t_sub[4:6]}-{t_sub[6:8]} {t_sub[8:10]}:{t_sub[10:12]}:{t_sub[12:]}"
        elif len(time_str) == 10 and time_str.isdigit():
            timestamp = datetime.fromtimestamp(int(time_str)).strftime("%Y-%m-%d %H:%M:%S")
        else:
            try:
                mtime = d_path.stat().st_mtime
                timestamp = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
            except Exception:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return {
            "run_id": run_id,
            "timestamp": timestamp,
            "scenarios_count": scenarios_count,
            "models": models,
            "system_instruction_mode": system_instruction_mode,
            "dataset_key": dataset_key,
            "iterations": iterations,
            "concurrency": concurrency,
            "accuracy_rate": accuracy_rate,
            "avg_ttlt": avg_ttlt,
            "status": status,
        }

    def list_all_runs(self, active_tasks: dict) -> list[dict]:
        """Lists all runs with 0ms in-memory cache for historical runs and real-time active state."""
        runs = []
        seen_run_ids = set()

        # 1. Process active running tasks from memory for instant 0ms visibility
        for active_id, task in list(active_tasks.items()):
            if not task.done():
                seen_run_ids.add(active_id)
                evs = get_run_events(active_id)
                scenarios_count = 0
                for ev in evs:
                    if "queries" in ev.get("info", "") or "scenarios" in ev.get("info", ""):
                        m = re.search(r"\((\d+)\s+(?:queries|scenarios)", ev.get("info", ""))
                        if m:
                            scenarios_count = int(m.group(1))
                            break

                time_str = active_id[4:] if active_id.startswith("run_") else active_id
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                if len(time_str) >= 14 and time_str[:14].isdigit():
                    t_sub = time_str[:14]
                    timestamp = f"{t_sub[:4]}-{t_sub[4:6]}-{t_sub[6:8]} {t_sub[8:10]}:{t_sub[10:12]}:{t_sub[12:]}"

                runs.append({
                    "run_id": active_id,
                    "timestamp": timestamp,
                    "scenarios_count": scenarios_count,
                    "models": ["gemini-3.5-flash"],
                    "system_instruction_mode": "Default",
                    "status": "running"
                })

        # 2. Process runs on disk using metadata cache
        if self.directory.is_dir():
            run_dirs = [p for p in self.directory.iterdir() if p.is_dir()]
            run_dirs.sort(key=lambda p: p.name, reverse=True)

            for p in run_dirs:
                rid = p.name
                if rid in seen_run_ids:
                    continue

                cached = self._metadata_cache.get(rid)
                if cached and cached.get("status") in ("completed", "failed", "cancelled"):
                    runs.append(cached)
                    continue

                meta = self.get_run_metadata(rid, p)
                if meta.get("status") in ("completed", "failed", "cancelled"):
                    self._metadata_cache[rid] = meta
                runs.append(meta)

        runs.sort(key=lambda r: r.get("timestamp", ""), reverse=True)
        return runs

    def load_manifest(self, run_id: str) -> Optional[list[dict]]:
        folder_str = self.get_run_folder(run_id)
        if folder_str:
            folder = Path(folder_str)
            for mf in folder.glob("manifest*.json"):
                try:
                    with mf.open("r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list) and data:
                            return data
                except Exception:
                    pass

            # Fallback 1: Reconstruct unique scenarios from results.json
            results_file = folder / "results.json"
            if results_file.is_file():
                try:
                    with results_file.open("r", encoding="utf-8") as f:
                        rows = json.load(f)
                    if isinstance(rows, list) and rows:
                        scenarios = []
                        seen_queries = set()
                        for r in rows:
                            q = r.get("query", "").strip()
                            if q and q not in seen_queries:
                                seen_queries.add(q)
                                exp_src = r.get("expected_source", "") or r.get("description", "")
                                if isinstance(exp_src, str) and "|" in exp_src:
                                    exp_src = [s.strip() for s in exp_src.split("|") if s.strip()]
                                elif isinstance(exp_src, str) and exp_src.strip():
                                    exp_src = [exp_src.strip()]
                                elif not isinstance(exp_src, list):
                                    exp_src = []
                                scenarios.append({
                                    "query": q,
                                    "ground_truth": r.get("ground_truth", "").strip(),
                                    "description": r.get("description", ""),
                                    "expected_source": exp_src,
                                    "connector_id": r.get("connectors_used", "") or r.get("connector_id", "all"),
                                    "glean_response_text": r.get("glean_response_text", ""),
                                    "glean_source_urls": r.get("glean_source_urls", "")
                                })
                        if scenarios:
                            return scenarios
                except Exception:
                    pass

        # Fallback 2: Check canonical dataset registry if dataset ID was passed
        try:
            canonical_scenarios = dataset_registry.load_scenarios(run_id)
            if canonical_scenarios:
                return canonical_scenarios
        except Exception:
            pass

        return None

    def load_results(self, run_id: str) -> list[dict]:
        folder_str = self.get_run_folder(run_id)
        if not folder_str:
            return []
        results_file = Path(folder_str) / "results.json"
        if results_file.is_file():
            try:
                with results_file.open("r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def load_events(self, run_id: str) -> list[dict]:
        folder_str = self.get_run_folder(run_id)
        if not folder_str:
            return []
        events_file = Path(folder_str) / "events_log.json"
        if events_file.is_file():
            try:
                with events_file.open("r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def record_cancellation(self, run_id: str) -> bool:
        folder_str = self.get_run_folder(run_id)
        if not folder_str:
            return False
        events = self.load_events(run_id)
        events.append({
            "step": "Execution",
            "status": "cancelled",
            "info": "Run manually cancelled by user via UI/API.",
            "time": datetime.now().strftime("%H:%M:%S")
        })
        events_file = Path(folder_str) / "events_log.json"
        try:
            with events_file.open("w", encoding="utf-8") as f:
                json.dump(events, f, indent=2)
            return True
        except Exception:
            return False


dataset_registry = DatasetRegistry()
run_repository = RunRepository()

def _get_safe_run_folder(run_id: str, allow_create: bool = False) -> str:
    clean_id = SafePathResolver.sanitize_token(run_id)
    folder = run_repository.get_run_folder(clean_id)
    if folder:
        return folder
    if allow_create:
        target = SafePathResolver.resolve_child(Path(run_repository.directory), clean_id)
        return str(target)
    raise HTTPException(status_code=404, detail="Run not found.")

def _get_safe_dataset_path(dataset_id: str, allow_create: bool = False) -> str:
    clean_key = SafePathResolver.sanitize_token(Path(dataset_id).stem)
    path = dataset_registry.get_path(clean_key)
    if path:
        return path
    if allow_create:
        target = SafePathResolver.resolve_child(Path(DATASETS_DIR), f"{clean_key}.json")
        return str(target)
    raise HTTPException(status_code=404, detail="Dataset not found.")

# Mount static folder
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Configure templates
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

def _read_csv_rows(filepath: str):
    if not os.path.exists(filepath):
        return []
    with open(filepath, mode="r", encoding="utf-8") as f:
        return list(csv.DictReader(f))

@app.api_route("/", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def index(request: Request):
    response = templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"v": int(time.time()), "request": request}
    )
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.api_route("/test", methods=["GET", "HEAD"], response_class=HTMLResponse)
@app.api_route("/testbed", methods=["GET", "HEAD"], response_class=HTMLResponse)
async def testbed_page(request: Request):
    response = templates.TemplateResponse(
        request=request,
        name="testbed.html",
        context={"v": int(time.time()), "request": request}
    )
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    """Silences browser favicon.ico 404 request."""
    return Response(status_code=204)

@app.get("/api/template/glean")
async def download_glean_template():
    """Returns the Glean CSV upload template."""
    csv_str = generate_glean_template_csv()
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=glean_import_template.csv"},
    )

@app.get("/api/template/dataset")
async def download_dataset_template(with_samples: bool = False):
    """Returns the blank benchmark dataset CSV upload template, or template with sample data if with_samples=true."""
    target_path = str(PATHS.dataset_import_template_with_samples_csv if with_samples else PATHS.dataset_import_template_csv)
    target_filename = "dataset_import_template_with_samples.csv" if with_samples else "dataset_import_template.csv"
    if os.path.exists(target_path):
        return FileResponse(
            path=target_path,
            media_type="text/csv",
            filename=target_filename,
        )
    fieldnames = CANONICAL_DATASET_FIELDS
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={target_filename}"},
    )

@app.get("/api/template/dataset/samples")
async def download_dataset_template_samples():
    """Returns the benchmark dataset CSV upload template populated with sample query rows."""
    return await download_dataset_template(with_samples=True)

@app.post("/api/evaluate/glean")
async def evaluate_glean_upload(file: UploadFile = File(...)):
    """
    Accepts uploaded Glean CSV file, runs Gemini 3.1 Pro LLM-as-a-Judge,
    and merges into the master comparison spreadsheet.
    """
    csv_bytes = await file.read()
    csv_text = csv_bytes.decode("utf-8")

    # Run LLM judge evaluation asynchronously
    glean_rows = await parse_glean_csv_and_evaluate(
        csv_text=csv_text,
        project_id=os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", "")),
        use_fallback_judge=False,
    )

    # Load existing GE streamAssist rows to merge
    path = MASTER_COMPARISON_PATH if os.path.exists(MASTER_COMPARISON_PATH) else GE_RESULTS_PATH
    ge_rows = _read_csv_rows(path) if os.path.exists(path) else []
    merged_rows = merge_master_comparison_csv(
        ge_rows=ge_rows,
        glean_rows=glean_rows,
        output_csv_path=MASTER_COMPARISON_PATH,
    )

    return {
        "status": "success",
        "glean_rows_evaluated": len(glean_rows),
        "total_master_rows": len(merged_rows),
        "glean_rows": glean_rows,
        "master_rows": merged_rows,
    }

@app.get("/api/master-comparison")
async def get_master_comparison():
    """Returns the master comparison JSON dataset for GUI rendering."""
    if os.path.exists(MASTER_COMPARISON_PATH):
        rows = _read_csv_rows(MASTER_COMPARISON_PATH)
    elif os.path.exists(GE_RESULTS_PATH):
        rows = _read_csv_rows(GE_RESULTS_PATH)
    else:
        rows = []
    return {"rows": rows}

@app.get("/api/download/master")
async def download_master_csv():
    """Downloads the unified master comparison spreadsheet."""
    path = MASTER_COMPARISON_PATH if os.path.exists(MASTER_COMPARISON_PATH) else GE_RESULTS_PATH
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="No master dataset found.")
    return FileResponse(path, filename="wellness_stipend_master_comparison.csv", media_type="text/csv")

@app.post("/api/upload/master")
async def upload_edited_master_csv(file: UploadFile = File(...)):
    """
    Accepts an uploaded master comparison CSV (with user edits or added queries),
    auto-judges new rows, backs up old master, and updates active master.
    """
    csv_bytes = await file.read()
    csv_text = csv_bytes.decode("utf-8")

    # Create timestamped backup of current master if it exists
    if os.path.exists(MASTER_COMPARISON_PATH):
        backup_dir = os.path.join(BASE_DIR, "backups")
        os.makedirs(backup_dir, exist_ok=True)
        backup_path = os.path.join(backup_dir, f"master_backup_{int(time.time())}.csv")
        shutil.copy2(MASTER_COMPARISON_PATH, backup_path)

    rows = await process_uploaded_master_csv(
        csv_text=csv_text,
        project_id=os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", "")),
        use_fallback_judge=False,
    )

    # Save to MASTER_COMPARISON_PATH
    os.makedirs(os.path.dirname(os.path.abspath(MASTER_COMPARISON_PATH)), exist_ok=True)
    with open(MASTER_COMPARISON_PATH, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=MASTER_COMPARISON_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

    return {"status": "success", "total_rows": len(rows), "rows": rows}

@app.post("/api/upload/custom_dataset")
async def upload_custom_dataset_csv(file: UploadFile = File(...)):
    """Accepts custom benchmark dataset CSV matching the canonical dataset schema."""
    csv_bytes = await file.read()
    csv_text = csv_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(csv_text))
    scenarios = []
    for row in reader:
        # Flexible key extraction
        q = (
            row.get("query", "")
            or row.get("Query", "")
            or row.get("user_query", "")
            or row.get("User_Query", "")
        ).strip()
        gt = (
            row.get("ground_truth", "")
            or row.get("Ground_Truth", "")
            or row.get("golden", "")
            or row.get("Golden", "")
            or row.get("golden_answer", "")
        ).strip()
        raw_src = (
            row.get("expected_source", "")
            or row.get("expected_sources", "")
            or row.get("source", "")
            or row.get("sources", "")
            or row.get("Expected_Source", "")
            or row.get("Expected_Sources", "")
        )
        if isinstance(raw_src, list):
            src_list = [str(s).strip() for s in raw_src if str(s).strip()]
        elif isinstance(raw_src, str):
            raw_src_str = raw_src.strip()
            if raw_src_str.startswith("[") and raw_src_str.endswith("]"):
                try:
                    src_list = json.loads(raw_src_str)
                except Exception:
                    src_list = [s.strip().strip("'\"") for s in raw_src_str[1:-1].split(",") if s.strip()]
            elif "|" in raw_src_str:
                src_list = [s.strip() for s in raw_src_str.split("|") if s.strip()]
            elif raw_src_str:
                src_list = [raw_src_str]
            else:
                src_list = []
        else:
            src_list = []

        cleaned_src_list = []
        for s in src_list:
            s_str = str(s).strip()
            if not s_str:
                continue
            if not is_valid_source_identifier(s_str):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid expected source in row #{len(scenarios) + 1}: '{s_str}'. Must be a valid HTTP or HTTPS URL (e.g. https://drive.google.com/...)."
                )
            cleaned_src_list.append(s_str)

        conn_id = (
            row.get("connector_id", "")
            or row.get("connectors_used", "")
            or row.get("connector", "")
            or row.get("Connector", "")
        )
        glean_resp = (
            row.get("glean_response_text", "")
            or row.get("glean_response", "")
            or row.get("gleans_response", "")
            or row.get("glean_response", "")
        ).strip()
        glean_srcs = (
            row.get("glean_source_urls", "")
            or row.get("glean_sources", "")
            or row.get("gleans_source", "")
            or row.get("glean_source", "")
        ).strip()

        if q:
            scenarios.append({
                "query": q,
                "ground_truth": gt,
                "expected_source": cleaned_src_list,
                "connector_id": conn_id,
                "glean_response_text": glean_resp,
                "glean_source_urls": glean_srcs,
            })

    return {"status": "success", "total_scenarios": len(scenarios), "scenarios": scenarios}

@app.post("/api/run_benchmark")
async def run_benchmark_endpoint(request: Request):
    """Triggers unified concurrent API benchmarking and LLM-as-a-Judge evaluation."""
    data = await request.json()
    run_id = request.query_params.get("run_id") or data.get("run_id")
    if not run_id:
        run_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}"
    dataset_key = data.get("dataset_key", "google-team-gdrive_dev_golden")
    
    # Normalize legacy un-prefixed or alias dataset_key names if passed
    legacy_prefix_map = {
        "gdrive_dev_golden": "google-team-gdrive_dev_golden",
        "gdrive_benchmark_small_10": "google-team-gdrive_benchmark_small_10",
        "gdrive_benchmark_medium_50": "google-team-gdrive_benchmark_medium_50",
        "gdrive_benchmark_large_150": "google-team-gdrive_benchmark_large_150",
        "five_samples_multi_datasource": "google-team-five_samples_multi_datasource",
        "single_sample_multi_datasource": "google-team-single_sample_multi_datasource",
        "full_enterprise_golden": "yahoo-team-full_enterprise_golden",
        "google-team-gdrive_benchmark_small_10_v2": "google-team-gdrive_benchmark_small_10",
        "google-team-gdrive_benchmark_medium_50_v2": "google-team-gdrive_benchmark_medium_50",
        "google-team-gdrive_benchmark_large_150_v2": "google-team-gdrive_benchmark_large_150",
        "gdrive_benchmark_small_10_v2": "google-team-gdrive_benchmark_small_10",
        "gdrive_benchmark_medium_50_v2": "google-team-gdrive_benchmark_medium_50",
        "gdrive_benchmark_large_150_v2": "google-team-gdrive_benchmark_large_150",
    }

    custom_scenarios = data.get("custom_scenarios", [])
    raw_scenarios = data.get("scenarios", [])

    scenarios = []
    if raw_scenarios:
        for s in raw_scenarios:
            if s.get("query"):
                scenarios.append(QueryScenarioConfig.from_dict(s))
    elif dataset_key == "custom_uploaded" and custom_scenarios:
        for s in custom_scenarios:
            if s.get("query"):
                scenarios.append(QueryScenarioConfig.from_dict(s))
    else:
        # 1. Check datasets registry for JSON dataset matching dataset_key
        json_scenarios = dataset_registry.load_scenarios(dataset_key)
        if not json_scenarios and dataset_key in legacy_prefix_map:
            json_scenarios = dataset_registry.load_scenarios(legacy_prefix_map[dataset_key])
        if json_scenarios and isinstance(json_scenarios, list):
            for s in json_scenarios:
                if isinstance(s, dict) and s.get("query"):
                    scenarios.append(QueryScenarioConfig.from_dict(s))

        # 2. Check datasets registry for CSV dataset matching dataset_key
        if not scenarios and isinstance(dataset_key, str):
            csv_rows = dataset_registry.load_csv_rows(dataset_key)
            if not csv_rows and dataset_key in legacy_prefix_map:
                csv_rows = dataset_registry.load_csv_rows(legacy_prefix_map[dataset_key])
            if csv_rows:
                for r in csv_rows:
                    if r.get("query"):
                        scenarios.append(QueryScenarioConfig(
                            query=r.get("query", ""),
                            ground_truth=r.get("ground_truth", ""),
                            description=r.get("expected_source", "") or r.get("connector", ""),
                            expected_source=r.get("expected_source", "") or r.get("source", ""),
                            connector_id=r.get("connector_id", "") or r.get("connector", "") or "all",
                            glean_response_text=r.get("glean_response_text", ""),
                            glean_source_urls=r.get("glean_source_urls", ""),
                        ))

    if not scenarios:
        scenarios = [
            QueryScenarioConfig(query="how much is the wellness stipend?", ground_truth="$150 per month", description="Wellness stipend check"),
            QueryScenarioConfig(query="what is the PTO rollover policy?", ground_truth="5 days", description="PTO rollover check"),
        ]

    config = ProtocolConfig(
        agent_ids=data.get("agent_ids", ["core_assistant"]),
        search_mode=data.get("search_mode", os.getenv("SEARCH_MODE", "Vector")),
        company_name=data.get("company_name", os.getenv("COMPANY_NAME", "Yahoo")),
        models=data.get("models", ["gemini-3.5-flash"]),
        instruction_sets=data.get("instruction_sets", ["Default"]),
        custom_system_instruction=data.get("custom_system_instruction", ""),
        answer_generation_mode=data.get("answer_generation_mode", "NORMAL"),
        assist_skipping_mode=data.get("assist_skipping_mode", "REQUEST_ASSIST"),
        search_result_mode=data.get("search_result_mode", "CHUNKS"),
        iterations=int(data.get("iterations", 1)),
        max_concurrent_calls=int(data.get("max_concurrent_calls", 10)),
        connectors=data.get("connectors", [os.getenv("CONNECTOR_ID", "all")]),
        dataset_key=dataset_key,
        active_connectors=data.get("active_connectors", []),
        api_timeout_sec=int(data.get("api_timeout_sec", 60)),
        scenario_timeout_sec=int(data.get("scenario_timeout_sec", 90)),
        run_timeout_sec=int(data.get("run_timeout_sec", 600)),
    )
    
    effective_project = data.get("project_id") or os.getenv("PROJECT_ID") or os.getenv("GCP_PROJECT")

    # Persist run_config.json immediately so monitor and formula render at t=0ms
    try:
        run_folder = _get_safe_run_folder(run_id, allow_create=True)
        if run_folder:
            os.makedirs(run_folder, exist_ok=True)
            config_payload = {
                "run_id": run_id,
                "dataset_key": dataset_key,
                "sample_count": len(scenarios),
                "total_requests": len(scenarios) * len(config.models) * len(config.instruction_sets) * config.iterations,
                "models": config.models,
                "instruction_sets": config.instruction_sets,
                "iterations": config.iterations,
                "max_concurrent_calls": config.max_concurrent_calls,
                "connectors": config.connectors,
                "active_connectors": data.get("active_connectors", config.connectors),
                "search_mode": config.search_mode,
                "company_name": config.company_name,
                "custom_system_instruction": config.custom_system_instruction,
                "system_instruction_mode": "Custom" if config.custom_system_instruction else "Default",
                "answer_generation_mode": data.get("answer_generation_mode", "NORMAL"),
                "assist_skipping_mode": data.get("assist_skipping_mode", "REQUEST_ASSIST"),
                "search_result_mode": data.get("search_result_mode", "CHUNKS"),
                "api_timeout_sec": data.get("api_timeout_sec", 60),
                "scenario_timeout_sec": data.get("scenario_timeout_sec", 120),
                "run_timeout_sec": data.get("run_timeout_sec", 600),
            }
            with open(os.path.join(run_folder, "run_config.json"), "w", encoding="utf-8") as f:
                json.dump(config_payload, f, indent=2)
    except Exception:
        pass

    # Invalidate any stale metadata cache and log initial Initialization step immediately
    run_repository._metadata_cache.pop(run_id, None)
    log_run_event(run_id, "Initialization", "running", f"Dataset: {dataset_key} ({len(scenarios)} queries)")

    is_background = bool(data.get("background", False) or request.query_params.get("background", "").lower() == "true")

    if is_background:
        async def _bg_run():
            try:
                await execute_unified_evaluation(
                    protocol_config=config,
                    scenarios=scenarios,
                    output_csv_path=MASTER_COMPARISON_PATH,
                    use_fallback_judge=data.get("use_fallback_judge", False),
                    project_id=effective_project,
                    run_id=run_id,
                )
            except asyncio.CancelledError:
                log_run_event(run_id, "Execution", "cancelled", "Run execution was manually cancelled by user via UI/API.")
            except Exception as bg_exc:
                import traceback
                log_run_event(run_id, "Execution Error", "failed", f"{bg_exc}\n{traceback.format_exc()}")
            finally:
                ACTIVE_RUN_TASKS.pop(run_id, None)

        task = asyncio.create_task(_bg_run())
        ACTIVE_RUN_TASKS[run_id] = task
        return {
            "status": "running",
            "run_id": run_id,
            "message": f"Benchmark run {run_id} started in background.",
            "total_scenarios": len(scenarios),
        }

    try:
        res = await execute_unified_evaluation(
            protocol_config=config,
            scenarios=scenarios,
            output_csv_path=MASTER_COMPARISON_PATH,
            use_fallback_judge=data.get("use_fallback_judge", False),
            project_id=effective_project,
            run_id=run_id,
        )
        
        return {
            "status": "success",
            "run_id": run_id,
            "records_count": len(res["records"]),
            "latency_summary": res["latency_summary"],
            "records": res["records"],
        }
    except Exception as exc:
        import traceback
        tb = traceback.format_exc()
        if run_id:
            log_run_event(run_id, "Execution Error", "failed", f"{exc}\n{tb}")
        logger.error(f"Execution error in run {run_id}: {exc}\n{tb}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "run_id": run_id,
                "error": "Evaluation execution failed. Check server logs for details."
            }
        )

@app.post("/api/runs/{run_id}/cancel")
async def cancel_run_endpoint(run_id: str):
    """Cancels an active running evaluation run immediately."""
    task = ACTIVE_RUN_TASKS.pop(run_id, None)
    cancelled_in_memory = False
    if task and not task.done():
        task.cancel()
        cancelled_in_memory = True

    run_repository.record_cancellation(run_id)

    return {
        "status": "success",
        "message": f"Run '{run_id}' has been cancelled.",
        "run_id": run_id,
        "cancelled_in_memory": cancelled_in_memory
    }

@app.get("/api/runs")
async def list_runs_endpoint():
    """Lists all historical and currently active runs with real-time in-memory status in <1ms."""
    cleanup_stale_cached_runs(max_age_seconds=600.0)
    runs = run_repository.list_all_runs(ACTIVE_RUN_TASKS)
    return {"status": "success", "runs": runs}

@app.get("/api/runs/{run_id}")
async def get_run_details_endpoint(run_id: str):
    """Fetches scenarios list from run manifest for duplication."""
    scenarios = run_repository.load_manifest(run_id)
    if scenarios is None:
        raise HTTPException(status_code=404, detail="Run manifest not found")
    return {"status": "success", "scenarios": scenarios}

@app.get("/api/runs/{run_id}/results")
async def get_run_results_endpoint(run_id: str):
    """Fetches the specific evaluation run's results.json file along with execution status and error details."""
    try:
        run_folder = _get_safe_run_folder(run_id)
    except HTTPException:
        return {
            "status": "success",
            "run_id": run_id,
            "run_status": "not_found",
            "error_message": f"Run folder '{run_id}' not found.",
            "rows": []
        }
        
    results_file = os.path.abspath(os.path.join(run_folder, "results.json"))
    rows = []
    if os.path.exists(results_file):
        try:
            with open(results_file, "r", encoding="utf-8") as f:
                rows = json.load(f)
        except Exception:
            pass

    events_file = os.path.abspath(os.path.join(run_folder, "events_log.json"))
    events = []
    status = "completed"
    error_message = ""
    failed_step = ""
    if os.path.exists(events_file):
        try:
            with open(events_file, "r", encoding="utf-8") as f:
                events = json.load(f)
                if events:
                    # Check if the pipeline completed normally
                    has_persistence_done = any(
                        ev.get("step") == "Persistence" and ev.get("status") in ("completed", "done")
                        for ev in events
                    )
                    if has_persistence_done or (rows and len(rows) > 0):
                        status = "completed"
                        error_message = ""
                    else:
                        for ev in reversed(events):
                            if "failed" in ev.get("status", "").lower() or "error" in ev.get("step", "").lower():
                                status = "failed"
                                error_message = ev.get("info") or ev.get("step") or "Step failed."
                                failed_step = ev.get("step", "")
                                break
                        if status != "failed" and events[-1].get("status") == "running":
                            status = "running"
        except Exception:
            pass

    # If rows are completely empty and no events, mark failed
    if not rows and status == "completed" and not events:
        status = "failed"
        error_message = "No result records or execution events were generated for this run."

    latency_summary = {}
    if rows:
        eval_api_ttlts = [
            float(r["ttlt_sec"])
            for r in rows
            if "ttlt_sec" in r and isinstance(r["ttlt_sec"], (int, float)) and float(r["ttlt_sec"]) > 0
        ]
        judge_ttlts = [
            float(r["judge_ttlt_sec"])
            for r in rows
            if "judge_ttlt_sec" in r and isinstance(r["judge_ttlt_sec"], (int, float)) and float(r["judge_ttlt_sec"]) > 0
        ]
        ttfts = [
            float(r["ttft_sec"])
            for r in rows
            if "ttft_sec" in r and isinstance(r["ttft_sec"], (int, float)) and float(r["ttft_sec"]) > 0
        ]
        status_counts_res = {}
        total_retries_res = 0
        retried_scenarios_res = 0
        for r in rows:
            hist = r.get("status_code_history") or [r.get("status_code", 200)]
            for sc in hist:
                sc_str = str(sc)
                status_counts_res[sc_str] = status_counts_res.get(sc_str, 0) + 1
            retries = int(r.get("retry_count", 0))
            total_retries_res += retries
            if retries > 0:
                retried_scenarios_res += 1

        latency_summary = {
            "eval_api_ttlt": calculate_latency_stats(eval_api_ttlts),
            "llm_judge_ttlt": calculate_latency_stats(judge_ttlts),
            "ttlt_sec": calculate_latency_stats(eval_api_ttlts),
            "judge_ttlt_sec": calculate_latency_stats(judge_ttlts),
            "ttft_sec": calculate_latency_stats(ttfts),
            "http_status_summary": {
                "total_dispatched_calls": sum(status_counts_res.values()) or len(rows),
                "successful_calls_count": sum(1 for r in rows if r.get("status_code", 200) == 200 and not r.get("error_message")),
                "retried_scenarios_count": retried_scenarios_res,
                "total_retries_count": total_retries_res,
                "status_code_breakdown": status_counts_res,
            }
        }

    return {
        "status": "success",
        "run_id": run_id,
        "run_status": status,
        "failed_step": failed_step,
        "error_message": error_message,
        "rows": rows,
        "events": events,
        "latency_summary": latency_summary,
    }

@app.post("/api/runs/{run_id}/diagnose/{scenario_idx}")
async def diagnose_run_scenario_endpoint(run_id: str, scenario_idx: int):
    """Executes on-demand Gemini 3.5 Flash root cause diagnosis for a scenario in a run."""
    from ge_eval_harness.backend.services.trace_diagnostician import (
        compile_full_scenario_logs,
        diagnose_scenario_failure,
    )
    run_folder = _get_safe_run_folder(run_id)
    results_file = os.path.join(run_folder, "results.json")
    if not os.path.exists(results_file):
        raise HTTPException(status_code=404, detail="Run results not found")
    
    with open(results_file, "r", encoding="utf-8") as f:
        rows = json.load(f)
    
    if scenario_idx < 0 or scenario_idx >= len(rows):
        raise HTTPException(status_code=400, detail="Invalid scenario index")
    
    rec = rows[scenario_idx]
    diag = await diagnose_scenario_failure(rec)
    full_logs = compile_full_scenario_logs(rec)
    rec["ai_diagnosis"] = diag
    rec["trace_logs"] = full_logs
    
    # Save updated record back to results.json
    try:
        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(rows, f, indent=2)
    except Exception:
        pass
    
    return {
        "status": "success",
        "scenario_idx": scenario_idx,
        "ai_diagnosis": diag,
        "trace_logs": full_logs,
    }

@app.get("/api/runs/{run_id}/events")
async def get_run_events_endpoint(run_id: str):
    """Fetches the step events logs list for monitoring."""
    events = get_run_events(run_id)
    try:
        run_folder = _get_safe_run_folder(run_id)
    except HTTPException:
        run_folder = None
    
    if not events and not run_folder:
        return {"status": "success", "events": []}
        
    config_data = {}
    latency_summary = {}

    if run_folder and os.path.exists(run_folder):
        config_file = os.path.abspath(os.path.join(run_folder, "run_config.json"))
        if config_file.startswith(run_folder) and os.path.exists(config_file):
            try:
                with open(config_file, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
            except Exception:
                pass
                
        results_file = os.path.abspath(os.path.join(run_folder, "results.json"))
        if results_file.startswith(run_folder) and os.path.exists(results_file):
            try:
                with open(results_file, "r", encoding="utf-8") as f:
                    rows = json.load(f)
                if isinstance(rows, list) and len(rows) > 0:
                    eval_api_ttlts = [
                        float(r["ttlt_sec"])
                        for r in rows
                        if "ttlt_sec" in r and isinstance(r["ttlt_sec"], (int, float)) and float(r["ttlt_sec"]) > 0
                    ]
                    judge_ttlts = [
                        float(r["judge_ttlt_sec"])
                        for r in rows
                        if "judge_ttlt_sec" in r and isinstance(r["judge_ttlt_sec"], (int, float)) and float(r["judge_ttlt_sec"]) > 0
                    ]
                    ttfts = [
                        float(r["ttft_sec"])
                        for r in rows
                        if "ttft_sec" in r and isinstance(r["ttft_sec"], (int, float)) and float(r["ttft_sec"]) > 0
                    ]
                    status_counts_ev = {}
                    total_retries_ev = 0
                    retried_scenarios_ev = 0
                    for r in rows:
                        hist = r.get("status_code_history") or [r.get("status_code", 200)]
                        for sc in hist:
                            sc_str = str(sc)
                            status_counts_ev[sc_str] = status_counts_ev.get(sc_str, 0) + 1
                        retries = int(r.get("retry_count", 0))
                        total_retries_ev += retries
                        if retries > 0:
                            retried_scenarios_ev += 1

                    latency_summary = {
                        "eval_api_ttlt": calculate_latency_stats(eval_api_ttlts),
                        "llm_judge_ttlt": calculate_latency_stats(judge_ttlts),
                        "ttlt_sec": calculate_latency_stats(eval_api_ttlts),
                        "judge_ttlt_sec": calculate_latency_stats(judge_ttlts),
                        "ttft_sec": calculate_latency_stats(ttfts),
                        "http_status_summary": {
                            "total_dispatched_calls": sum(status_counts_ev.values()) or len(rows),
                            "successful_calls_count": sum(1 for r in rows if r.get("status_code", 200) == 200 and not r.get("error_message")),
                            "retried_scenarios_count": retried_scenarios_ev,
                            "total_retries_count": total_retries_ev,
                            "status_code_breakdown": status_counts_ev,
                        }
                    }

                    if not config_data:
                        models = list(set(r.get("model_id") for r in rows if r.get("model_id"))) or ["gemini-3.5-flash"]
                        connectors = list(set(r.get("connectors_used") for r in rows if r.get("connectors_used")))
                        iterations = max((int(r.get("iterations", 1)) for r in rows), default=1)
                        custom_instructions = next((r.get("custom_system_instruction") for r in rows if r.get("custom_system_instruction")), "")
                        
                        config_data = {
                            "agent_ids": ["core_assistant"],
                            "models": models,
                            "interfaces": ["api_stream_assist"],
                            "instruction_sets": ["Default"],
                            "connectors": connectors,
                            "iterations": iterations,
                            "max_concurrent_calls": 10,
                            "custom_system_instruction": custom_instructions,
                            "sample_count": len(rows),
                            "total_requests": len(rows),
                        }
            except Exception:
                pass

        # Ensure sample_count and total_requests exist from manifest if not present in config_data
        if isinstance(config_data, dict):
            try:
                manifest_file = next((f for f in os.listdir(run_folder) if f.startswith("manifest_") and f.endswith(".json")), None)
                if manifest_file:
                    with open(os.path.join(run_folder, manifest_file), "r", encoding="utf-8") as mf:
                        sc_data = json.load(mf)
                    if isinstance(sc_data, list) and len(sc_data) > 0:
                        if not config_data.get("sample_count"):
                            config_data["sample_count"] = len(sc_data)
                        if not config_data.get("total_requests"):
                            m_len = len(config_data.get("models", ["gemini-3.5-flash"])) or 1
                            it_len = int(config_data.get("iterations", 1)) or 1
                            inst_len = len(config_data.get("instruction_sets", ["Default"])) or 1
                            config_data["total_requests"] = len(sc_data) * m_len * it_len * inst_len
            except Exception:
                pass

            if config_data:
                is_custom = bool(config_data.get("custom_system_instruction") or "Custom" in config_data.get("instruction_sets", []))
                config_data["system_instruction_mode"] = "Custom" if is_custom else "Default"

    run_status = "running"
    if any(ev.get("step") == "Persistence" and str(ev.get("status", "")).lower() in ("completed", "done") for ev in events):
        run_status = "completed"
    elif any(str(ev.get("status", "")).lower() in ("failed", "error") for ev in events):
        run_status = "failed"
    elif not events and run_folder and os.path.exists(os.path.join(run_folder, "results.json")):
        run_status = "completed"

    return {
        "status": "success",
        "run_status": run_status,
        "events": events,
        "run_config": config_data,
        "latency_summary": latency_summary
    }

@app.post("/api/datasets/add_source")
async def add_source_to_dataset_endpoint(request: Request):
    """
    Appends a verified cited document URL/ID to the golden dataset's expected_sources list,
    and updates any active/historical run results matching this scenario.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    query_text = (payload.get("query") or payload.get("query_text") or "").strip().lower()
    source_url = (payload.get("new_source_url") or payload.get("source_url") or payload.get("source") or "").strip()
    dataset_key = (payload.get("dataset_name") or payload.get("dataset_key") or "gdrive_dev_golden").strip()
    run_id = (payload.get("run_id") or "").strip()

    if not query_text or not source_url:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "query and source_url are required."}
        )

    # Locate dataset file
    datasets_dir = os.path.join(BASE_DIR, "data", "datasets")
    matched_file = None
    if os.path.exists(datasets_dir):
        for fname in os.listdir(datasets_dir):
            if fname.endswith(".json") and (dataset_key in fname or fname.replace(".json", "") == dataset_key):
                matched_file = os.path.join(datasets_dir, fname)
                break
        if not matched_file:
            # Try finding any dataset containing the query
            for fname in os.listdir(datasets_dir):
                if fname.endswith(".json"):
                    cand_path = os.path.join(datasets_dir, fname)
                    try:
                        with open(cand_path, "r", encoding="utf-8") as f:
                            c_data = json.load(f)
                        if isinstance(c_data, list) and any(query_text in str(item.get("query", "")).lower() for item in c_data):
                            matched_file = cand_path
                            break
                    except Exception:
                        pass

    updated_sources = source_url
    if matched_file and os.path.exists(matched_file):
        try:
            with open(matched_file, "r", encoding="utf-8") as f:
                dataset_items = json.load(f)
            if isinstance(dataset_items, list):
                for item in dataset_items:
                    item_q = str(item.get("query", "")).strip().lower()
                    if query_text in item_q or item_q in query_text:
                        existing = item.get("expected_source") or item.get("expected_sources") or []
                        if isinstance(existing, list):
                            if source_url not in existing:
                                existing.append(source_url)
                            item["expected_source"] = existing
                            updated_sources = " | ".join(existing)
                        elif isinstance(existing, str):
                            if source_url not in existing:
                                new_val = f"{existing} | {source_url}" if existing else source_url
                                item["expected_source"] = new_val
                                updated_sources = new_val
                        break
                with open(matched_file, "w", encoding="utf-8") as f:
                    json.dump(dataset_items, f, indent=2)
        except Exception as err:
            print(f"Failed to update dataset file {matched_file}: {err}", flush=True)

    # Retroactively update run results if run_id is supplied
    if run_id:
        run_folder = os.path.join(BASE_DIR, "data", "runs", run_id)
        res_file = os.path.join(run_folder, "results.json")
        if os.path.exists(res_file):
            try:
                with open(res_file, "r", encoding="utf-8") as rf:
                    run_results = json.load(rf)
                if isinstance(run_results, list):
                    for r_item in run_results:
                        r_q = str(r_item.get("query", "")).strip().lower()
                        if query_text in r_q or r_q in query_text:
                            r_item["has_required_source"] = True
                            r_item["evidence_match"] = True
                            r_item["expected_source"] = updated_sources
                    with open(res_file, "w", encoding="utf-8") as rf:
                        json.dump(run_results, rf, indent=2)
            except Exception as r_err:
                print(f"Failed to update results.json for run {run_id}: {r_err}", flush=True)

    return {
        "status": "success",
        "message": f"Successfully added {source_url} to golden dataset references.",
        "updated_sources": updated_sources,
        "dataset_file": os.path.basename(matched_file) if matched_file else "dataset",
    }

@app.post("/api/datasets/replace_source")
async def replace_source_endpoint(request: Request):
    """
    Replaces an existing (weak/deprecated) golden reference with a new verified source URL in dataset files
    and retroactively updates results.json for the active run.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    dataset_key = str(payload.get("dataset_name") or payload.get("dataset_key") or "").strip()
    query_text = str(payload.get("query") or payload.get("query_text") or "").strip().lower()
    old_source_url = str(payload.get("old_source_url") or payload.get("old_source") or "").strip()
    new_source_url = str(payload.get("new_source_url") or payload.get("new_source") or payload.get("source_url") or "").strip()
    run_id = str(payload.get("run_id", "")).strip()

    if not query_text or not new_source_url:
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": "query and new_source_url are required."}
        )

    # Locate dataset file
    datasets_dir = os.path.join(BASE_DIR, "data", "datasets")
    matched_file = None
    if os.path.exists(datasets_dir):
        for fname in os.listdir(datasets_dir):
            if fname.endswith(".json") and (dataset_key in fname or fname.replace(".json", "") == dataset_key):
                matched_file = os.path.join(datasets_dir, fname)
                break
        if not matched_file:
            for fname in os.listdir(datasets_dir):
                if fname.endswith(".json"):
                    cand_path = os.path.join(datasets_dir, fname)
                    try:
                        with open(cand_path, "r", encoding="utf-8") as f:
                            c_data = json.load(f)
                        if isinstance(c_data, list) and any(query_text in str(item.get("query", "")).lower() for item in c_data):
                            matched_file = cand_path
                            break
                    except Exception:
                        pass

    updated_sources = new_source_url
    if matched_file and os.path.exists(matched_file):
        try:
            with open(matched_file, "r", encoding="utf-8") as f:
                dataset_items = json.load(f)
            if isinstance(dataset_items, list):
                for item in dataset_items:
                    item_q = str(item.get("query", "")).strip().lower()
                    if query_text in item_q or item_q in query_text:
                        existing = item.get("expected_source") or item.get("expected_sources") or []
                        if isinstance(existing, list):
                            if old_source_url in existing:
                                existing = [new_source_url if s == old_source_url else s for s in existing]
                            else:
                                existing = [new_source_url]
                            item["expected_source"] = existing
                            updated_sources = " | ".join(existing)
                        elif isinstance(existing, str):
                            if old_source_url and old_source_url in existing:
                                new_val = existing.replace(old_source_url, new_source_url)
                            else:
                                new_val = new_source_url
                            item["expected_source"] = new_val
                            updated_sources = new_val
                        break
                with open(matched_file, "w", encoding="utf-8") as f:
                    json.dump(dataset_items, f, indent=2)
        except Exception as err:
            print(f"Failed to update dataset file {matched_file}: {err}", flush=True)

    # Retroactively update run results if run_id is supplied
    if run_id:
        run_folder = os.path.join(BASE_DIR, "data", "runs", run_id)
        res_file = os.path.join(run_folder, "results.json")
        if os.path.exists(res_file):
            try:
                with open(res_file, "r", encoding="utf-8") as rf:
                    run_results = json.load(rf)
                if isinstance(run_results, list):
                    for r_item in run_results:
                        r_q = str(r_item.get("query", "")).strip().lower()
                        if query_text in r_q or r_q in query_text:
                            r_item["has_required_source"] = True
                            r_item["evidence_match"] = True
                            r_item["gt_source_quality"] = "STRONG"
                            r_item["expected_source"] = updated_sources
                    with open(res_file, "w", encoding="utf-8") as rf:
                        json.dump(run_results, rf, indent=2)
            except Exception as r_err:
                print(f"Failed to update results.json for run {run_id}: {r_err}", flush=True)

    return {
        "status": "success",
        "message": f"Successfully replaced golden dataset reference with {new_source_url}.",
        "updated_sources": updated_sources,
        "dataset_file": os.path.basename(matched_file) if matched_file else "dataset",
    }

@app.get("/api/testbed/datastores")
async def get_testbed_datastores_endpoint():
    """Returns all dynamically discovered DataStores attached to the active Discovery Engine engine."""
    from ge_eval_harness.backend.services.document_connector_service import get_document_connector_service, format_connector_display_name
    doc_service = get_document_connector_service()
    datastores = await doc_service._get_engine_datastores_dynamic()
    return {
        "status": "success",
        "datastores": [
            {
                "id": ds,
                "display_name": format_connector_display_name(ds),
            }
            for ds in datastores
        ],
        "count": len(datastores),
    }

@app.post("/api/testbed/probe")
async def run_testbed_probe_endpoint(request: Request):
    """
    Executes a live parallel connector probe across multiple target IDs / URLs and queries.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    targets_raw = payload.get("targets") or payload.get("target") or payload.get("ids") or []
    if isinstance(targets_raw, str):
        targets = [t.strip() for t in re.split(r"[\n,]+", targets_raw) if t.strip()]
    elif isinstance(targets_raw, list):
        targets = [str(t).strip() for t in targets_raw if str(t).strip()]
    else:
        targets = []

    scenario_query = (payload.get("scenario_query") or payload.get("query") or "").strip()
    connector_ids = payload.get("connector_ids") or payload.get("connector") or "all"
    timeout_sec = float(payload.get("timeout_sec", 3.5))

    from ge_eval_harness.backend.services.document_connector_service import DocumentConnectorService
    service = DocumentConnectorService(timeout_sec=timeout_sec)
    result = await service.execute_parallel_testbed(
        targets=targets,
        scenario_query=scenario_query,
        connector_ids=connector_ids,
    )
    return JSONResponse(status_code=200, content=result)

@app.post("/api/testbed/stream-assist")
async def run_stream_assist_testbed_endpoint(request: Request):
    """
    Executes a parallel streamAssist document reading & grounding audit across multiple target links/IDs.
    """
    try:
        payload = await request.json()
    except Exception:
        payload = {}

    targets_raw = payload.get("targets") or payload.get("target") or payload.get("ids") or []
    if isinstance(targets_raw, str):
        targets = [t.strip() for t in re.split(r"[\n,]+", targets_raw) if t.strip()]
    elif isinstance(targets_raw, list):
        targets = [str(t).strip() for t in targets_raw if str(t).strip()]
    else:
        targets = []

    scenario_query = (payload.get("scenario_query") or payload.get("query") or "").strip()
    ground_truth = (payload.get("ground_truth") or payload.get("target_answer") or "").strip()
    agent_id = payload.get("agent_id") or "core_assistant"
    model_id = payload.get("model_id") or "gemini-3.5-flash"
    search_mode = payload.get("search_mode") or "Agentic"
    timeout_sec = float(payload.get("timeout_sec", 45.0))

    from ge_eval_harness.backend.services.stream_assist_client import execute_stream_assist_testbed
    try:
        result = await execute_stream_assist_testbed(
            targets=targets,
            scenario_query=scenario_query,
            ground_truth=ground_truth,
            agent_id=agent_id,
            model_id=model_id,
            timeout_sec=timeout_sec,
            search_mode=search_mode,
        )
        return JSONResponse(status_code=200, content=result)
    except Exception as exc:
        err_msg = str(exc)
        if "ADC AUTHENTICATION ERROR" in err_msg or "Reauthentication is needed" in err_msg or "RefreshError" in err_msg:
            raise HTTPException(
                status_code=401,
                detail="Google Cloud ADC authentication expired. Please run 'gcloud auth application-default login' in your terminal."
            )
        raise HTTPException(status_code=500, detail=f"streamAssist test bed error: {err_msg}")

@app.get("/api/settings/sysinfo")
async def settings_sysinfo_endpoint():
    """Gathers gcloud credentials diagnostic info and active environment variables."""
    gcloud_acc = "Not Authenticated"
    try:
        res = subprocess.run(["gcloud", "config", "get-value", "account"], capture_output=True, text=True, timeout=3)
        if res.returncode == 0 and res.stdout.strip():
            gcloud_acc = res.stdout.strip()
    except Exception:
        pass

    project_id = os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", ""))
    project_number = os.getenv("PROJECT_NUMBER", os.getenv("GCP_PROJECT_NUMBER", os.getenv("CONTAINER_NUM", "")))
    if not project_number and project_id:
        try:
            res_num = subprocess.run(["gcloud", "projects", "describe", project_id, "--format=value(projectNumber)"], capture_output=True, text=True, timeout=3)
            if res_num.returncode == 0 and res_num.stdout.strip():
                project_number = res_num.stdout.strip()
        except Exception:
            pass
        
    sysinfo = {
        "env_variables": {
            "PROJECT_ID": project_id,
            "PROJECT_NUMBER": project_number or project_id,
            "COMPANY_NAME": os.getenv("COMPANY_NAME", "Yahoo"),
            "SEARCH_MODE": os.getenv("SEARCH_MODE", "Vector"),
            "ENGINE_ID": os.getenv("ENGINE_ID", os.getenv("APP_ID", "")),
            "CONNECTOR_ID": os.getenv("CONNECTOR_ID", ""),
            "LOCATION": os.getenv("LOCATION", "global"),
            "EVAL_HARNESS_PORT": os.getenv("EVAL_HARNESS_PORT", "8095"),
            "LOCAL_TUNNELING_EVAL_PORT": os.getenv("LOCAL_TUNNELING_EVAL_PORT", "9225"),
        },
        "adc_status": {
            "authenticated": gcloud_acc != "Not Authenticated",
            "account": gcloud_acc
        }
    }
    return {"status": "success", "sysinfo": sysinfo}

@app.get("/api/export_master_csv")
async def export_master_csv_endpoint():
    """Exports the 26-column unified master comparison spreadsheet."""
    path = MASTER_COMPARISON_PATH if os.path.exists(MASTER_COMPARISON_PATH) else GE_RESULTS_PATH
    if not os.path.exists(path):
        # Generate an empty master comparison CSV with headers if none exists
        os.makedirs(os.path.dirname(os.path.abspath(MASTER_COMPARISON_PATH)), exist_ok=True)
        with open(MASTER_COMPARISON_PATH, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=MASTER_COMPARISON_FIELDNAMES)
            writer.writeheader()
        path = MASTER_COMPARISON_PATH
    return FileResponse(path, filename="wellness_stipend_master_comparison.csv", media_type="text/csv")

@app.get("/api/discovery/inspect")
async def discovery_inspect_endpoint():
    """Returns Discovery Engine collections/connectors and W3C OpenTelemetry trace sample."""
    collections = inspect_collections()
    trace_info = generate_w3c_traceparent()
    return {
        "status": "success",
        "collections": collections if isinstance(collections, list) else [],
        "sample_trace": trace_info,
    }

@app.post("/api/browser/record_session")
async def browser_record_session_endpoint(request: Request):
    """Automates headless UI preview session recording via Playwright CDP."""
    data = await request.json()
    system = data.get("system", "Gemini_Enterprise")
    query = data.get("query", "what is the wellness stipend?")
    ground_truth = data.get("ground_truth", "$150 per month")
    mock_offline = data.get("mock_offline", False)
    
    record = await record_ui_session(
        system=system,
        query=query,
        ground_truth=ground_truth,
        mock_offline=mock_offline,
    )
    return {
        "status": "success",
        "record": record,
    }

@app.post("/api/export/bigquery")
async def export_bigquery_endpoint(request: Request):
    """Exports 26-column master comparison records directly to BigQuery."""
    data = await request.json()
    dataset_id = data.get("dataset_id", "yahoo_ge_benchmarks")
    table_id = data.get("table_id", "master_comparison_records")
    dry_run = data.get("dry_run", True)

    path = MASTER_COMPARISON_PATH if os.path.exists(MASTER_COMPARISON_PATH) else GE_RESULTS_PATH
    records = _read_csv_rows(path) if os.path.exists(path) else []
    result = export_records_to_bigquery(
        records=records,
        dataset_id=dataset_id,
        table_id=table_id,
        dry_run=dry_run,
    )
    return result

@app.post("/api/datasets/export/bigquery")
async def export_dataset_bigquery_endpoint(request: Request):
    """Exports scenarios from a canonical dataset or historical run manifest directly to BigQuery."""
    data = await request.json()
    dataset_id = data.get("dataset_id", "")
    dataset_type = data.get("dataset_type", "canonical")  # 'canonical' or 'run'
    bq_dataset_id = data.get("bq_dataset_id", "yahoo_ge_benchmarks")
    table_id = data.get("table_id")
    project_id = data.get("project_id") or os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", ""))
    dry_run = data.get("dry_run", False)

    scenarios = []
    if dataset_type == "run":
        scenarios = run_repository.load_manifest(dataset_id)
        if scenarios is None:
            raise HTTPException(status_code=404, detail="Run manifest not found")
    else:
        scenarios = dataset_registry.load_scenarios(dataset_id)
        if scenarios is None:
            raise HTTPException(status_code=404, detail="Dataset not found")

    result = export_dataset_to_bigquery(
        scenarios=scenarios,
        dataset_name=dataset_id,
        bq_dataset_id=bq_dataset_id,
        table_id=table_id,
        project_id=project_id,
        dry_run=dry_run,
    )
    return result

def seed_default_datasets():
    """Seeds default datasets from CSV if not already present in json format."""
    os.makedirs(DATASETS_DIR, exist_ok=True)
    os.makedirs(ANALYSIS_DIR, exist_ok=True)
    os.makedirs(RUNS_DIR, exist_ok=True)
    os.makedirs(LOGS_DIR, exist_ok=True)
    
    # 1. Seed google-team-gdrive_dev_golden
    gdrive_json = os.path.join(DATASETS_DIR, "google-team-gdrive_dev_golden.json")
    if not os.path.exists(gdrive_json):
        scenarios = []
        csv_p = os.path.join(DATASETS_DIR, "google-team-gdrive_dev_golden.csv")
        if os.path.exists(csv_p):
            with open(csv_p, mode="r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    q = r.get("query", "").strip()
                    if q:
                        src = r.get("expected_source", "").strip()
                        srcs = [s.strip() for s in src.split("|") if s.strip()] if "|" in src else ([src] if src else [])
                        scenarios.append({
                            "query": q,
                            "ground_truth": r.get("ground_truth", "").strip(),
                            "expected_source": srcs,
                            "connector_id": r.get("connector_id", "") or os.getenv("DEFAULT_GDRIVE_CONNECTOR_ID", os.getenv("CONNECTOR_ID", "google_drive")),
                            "glean_response_text": r.get("glean_response_text", "").strip(),
                            "glean_source_urls": r.get("glean_source_urls", "").strip() or r.get("gleans_source", "").strip()
                        })
            if scenarios:
                with open(gdrive_json, "w", encoding="utf-8") as f:
                    json.dump(scenarios, f, indent=2)

    # 2. Seed yahoo-team-full_enterprise_golden
    enterprise_json = os.path.join(DATASETS_DIR, "yahoo-team-full_enterprise_golden.json")
    if not os.path.exists(enterprise_json):
        scenarios = []
        csv_p = os.path.join(DATASETS_DIR, "yahoo-team-full_enterprise_golden.csv")
        if os.path.exists(csv_p):
            with open(csv_p, mode="r", encoding="utf-8-sig") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    q = r.get("query", "").strip()
                    if q:
                        conn_id = r.get("connector_id", "").strip()
                        if not conn_id:
                            conn = r.get("connector", "").lower()
                            if "confluence" in conn:
                                conn_id = os.getenv("DEFAULT_CONFLUENCE_CONNECTOR_ID", "confluence")
                            elif "jira" in conn:
                                conn_id = os.getenv("DEFAULT_JIRA_CONNECTOR_ID", "jira")
                            elif "gdrive" in conn or "google drive" in conn:
                                conn_id = os.getenv("DEFAULT_GDRIVE_CONNECTOR_ID", os.getenv("CONNECTOR_ID", "google_drive"))
                            elif "slack" in conn:
                                conn_id = os.getenv("DEFAULT_SLACK_CONNECTOR_ID", "slack")
                            else:
                                conn_id = "all"
                            
                        src = r.get("expected_source", "").strip()
                        srcs = [s.strip() for s in src.split("|") if s.strip()] if "|" in src else ([src] if src else [])
                        scenarios.append({
                            "query": q,
                            "ground_truth": r.get("ground_truth", "").strip(),
                            "expected_source": srcs,
                            "connector_id": conn_id,
                            "glean_response_text": r.get("glean_response_text", "").strip(),
                            "glean_source_urls": r.get("glean_source_urls", "").strip() or r.get("gleans_source", "").strip()
                        })
            if scenarios:
                with open(enterprise_json, "w", encoding="utf-8") as f:
                    json.dump(scenarios, f, indent=2)

# Trigger seeding
seed_default_datasets()

@app.get("/api/datasets")
async def list_datasets_endpoint():
    """Lists all saved golden datasets."""
    datasets = dataset_registry.list_datasets()
    return {"status": "success", "datasets": datasets}

@app.get("/api/datasets/{dataset_id}")
async def get_dataset_endpoint(dataset_id: str):
    """Fetches details for a specific dataset."""
    scenarios = dataset_registry.load_scenarios(dataset_id)
    if scenarios is None:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"status": "success", "scenarios": scenarios}

@app.post("/api/datasets/{dataset_id}")
async def save_dataset_endpoint(dataset_id: str, request: Request):
    """Creates or updates a dataset with the scenarios list payload."""
    data = await request.json()
    scenarios = data.get("scenarios", [])
    
    validated = []
    for idx, s in enumerate(scenarios):
        if s.get("query"):
            raw_sources = s.get("expected_source") if isinstance(s.get("expected_source"), list) else [s.get("expected_source")] if s.get("expected_source") else []
            cleaned_sources = []
            for src in raw_sources:
                src_str = str(src).strip()
                if not src_str:
                    continue
                if not is_valid_source_identifier(src_str):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid expected source in row #{idx + 1}: '{src_str}'. Must be a valid HTTP or HTTPS URL (e.g. https://drive.google.com/...)."
                    )
                cleaned_sources.append(src_str)

            validated.append({
                "query": s.get("query", "").strip(),
                "ground_truth": s.get("ground_truth", "").strip(),
                "expected_source": cleaned_sources,
                "connector_id": s.get("connector_id", "all"),
                "glean_response_text": s.get("glean_response_text", "").strip(),
                "glean_source_urls": s.get("glean_source_urls", "").strip()
            })
            
    try:
        dataset_registry.save_dataset(dataset_id, validated)
        return {"status": "success", "dataset_id": dataset_id, "scenarios_count": len(validated)}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save dataset.")

@app.delete("/api/datasets/{dataset_id}")
async def delete_dataset_endpoint(dataset_id: str):
    """Deletes a dataset."""
    deleted = dataset_registry.delete_dataset(dataset_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"status": "success", "message": f"Dataset '{dataset_id}' deleted."}

if __name__ == "__main__":
    import socket
    import sys
    import uvicorn
    port = int(os.getenv("EVAL_HARNESS_PORT", os.getenv("PORT", os.getenv("ANTIGRAVITY_SIDECAR_WEB_PORT", 8095))))
    for i, arg in enumerate(sys.argv):
        if arg == "--port" and i + 1 < len(sys.argv):
            try:
                port = int(sys.argv[i + 1])
            except ValueError:
                pass
        elif arg.startswith("--port="):
            try:
                port = int(arg.split("=", 1)[1])
            except ValueError:
                pass

    use_ssl = os.getenv("EVAL_HARNESS_SSL", os.getenv("USE_SSL", "0")).lower() in ("1", "true", "yes") or "--ssl" in sys.argv
    cert_file = Path(__file__).parent / "certs" / "cert.pem"
    key_file = Path(__file__).parent / "certs" / "key.pem"

    proto = "https" if (use_ssl and cert_file.is_file() and key_file.is_file()) else "http"
    print(f"🚀 Starting Yahoo Eval Harness GUI on {proto}://localhost:{port} (or {proto}://127.0.0.1:{port})")

    bind_host = os.environ.get("EVAL_HARNESS_HOST", "127.0.0.1")
    config_kwargs = {
        "host": bind_host,
        "port": port,
        "log_level": "info",
        "timeout_graceful_shutdown": 2.0,
    }
    if proto == "https":
        config_kwargs["ssl_certfile"] = str(cert_file)
        config_kwargs["ssl_keyfile"] = str(key_file)

    uvicorn.run("ge_eval_harness.backend.app:app", **config_kwargs)
