#!/usr/bin/env python3
"""
Glean Web App CSV Import, LLM-as-a-Judge Evaluation, and Master Comparison Spreadsheet Service.
"""

import asyncio
import csv
import io
import json
import os
import sys
from pathlib import Path
import uuid
from typing import Any, Dict, List, Optional

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from ge_eval_harness.backend.services.citation_matcher import evaluate_citations
from ge_eval_harness.backend.services.llm_judge_service import evaluate_accuracy, run_llm_judge
from ge_eval_harness.config import MASTER_COMPARISON_SCHEMA_PATH

GLEAN_TEMPLATE_HEADERS = [
    "query",
    "ground_truth",
    "expected_source",
    "glean_response_text",
    "glean_source_urls",
    "glean_latency_ttlt_sec",
]


def _load_master_fieldnames() -> List[str]:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        MASTER_COMPARISON_SCHEMA_PATH,
        os.path.join(base_dir, "..", "config", "master_comparison_schema.json"),
        os.path.join(base_dir, "config", "master_comparison_schema.json"),
        os.path.join(base_dir, "..", "master_comparison_schema.json"),
        os.path.join(base_dir, "master_comparison_schema.json"),
    ]
    for schema_path in candidates:
        if os.path.exists(schema_path):
            try:
                with open(schema_path, "r", encoding="utf-8") as f:
                    schema = json.load(f)
                    return list(schema.get("properties", {}).keys())
            except Exception:
                pass
    return [
        "run_id", "system", "model_id", "instruction_set", "agent_id", "connectors_used",
        "iteration", "query", "ground_truth", "response_text", "response_word_count",
        "accuracy_pass", "judge_pass", "judge_confidence", "judge_reasoning", "ttft_sec",
        "ttlt_sec", "has_required_source", "total_sources_count", "additional_sources_count",
        "source_urls", "status_code", "trace_id", "span_id", "generation_speed_tps", "error_message",
    ]


MASTER_COMPARISON_FIELDNAMES = _load_master_fieldnames()


def generate_glean_template_csv() -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(GLEAN_TEMPLATE_HEADERS)
    writer.writerow(
        [
            "how much is the wellness stipend?",
            "$150 per month",
            "https://drive.google.com/file/d/fake_glean_drive_doc_id_999/view?usp=drive_link",
            "",
            "",
            "",
        ]
    )
    return output.getvalue()


def _parse_url_list(raw_sources: str) -> List[str]:
    if not raw_sources:
        return []
    urls = []
    cleaned = raw_sources.replace("\r\n", "|").replace("\n", "|").replace(",", "|")
    parts = [p.strip() for p in cleaned.split("|") if p.strip()]
    for p in parts:
        urls.append(p)
    return urls


async def parse_glean_csv_and_evaluate(
    csv_text: str,
    project_id: Optional[str] = None,
    use_fallback_judge: bool = False,
) -> List[Dict[str, Any]]:
    effective_project = project_id or os.getenv("PROJECT_ID") or os.getenv("GCP_PROJECT")
    reader = csv.DictReader(io.StringIO(csv_text))
    glean_rows = []
    row_idx = 0

    for row in reader:
        row_idx += 1
        query = row.get("query", "").strip()
        gt = row.get("ground_truth", "").strip()
        expected_src = row.get("expected_source", "").strip()
        resp_text = row.get("glean_response_text", "").strip()
        raw_urls = row.get("glean_source_urls", "")
        latency_str = row.get("glean_latency_ttlt_sec", "0.0")

        try:
            ttlt_sec = float(latency_str) if latency_str else 0.0
        except ValueError:
            ttlt_sec = 0.0

        source_urls = _parse_url_list(raw_urls)
        cit_metrics = evaluate_citations(source_urls, expected_src, response_text=resp_text)
        word_cnt = len(resp_text.split()) if resp_text else 0

        if use_fallback_judge:
            acc_pass = evaluate_accuracy(resp_text, gt)
            judge_res = {
                "judge_pass": acc_pass,
                "judge_confidence": 1.0 if acc_pass else 0.0,
                "judge_reasoning": "Offline fallback substring evaluation.",
            }
        else:
            judge_res = await run_llm_judge(query, gt, resp_text, effective_project)

        glean_rows.append(
            {
                "run_id": f"glean_web_run_{row_idx}_{uuid.uuid4().hex[:4]}",
                "system": "Glean_Web",
                "model_id": "glean-default",
                "instruction_set": "N/A",
                "agent_id": "N/A",
                "connectors_used": "Glean Web App",
                "iteration": row_idx,
                "query": query,
                "ground_truth": gt,
                "response_text": resp_text.replace("\n", " "),
                "response_word_count": word_cnt,
                "accuracy_pass": judge_res["judge_pass"],
                "judge_pass": judge_res["judge_pass"],
                "judge_confidence": judge_res["judge_confidence"],
                "judge_reasoning": judge_res["judge_reasoning"],
                "ttft_sec": 0.0,
                "ttlt_sec": round(ttlt_sec, 3),
                "has_required_source": cit_metrics["has_required_source"],
                "total_sources_count": cit_metrics["total_sources_count"],
                "additional_sources_count": cit_metrics["additional_sources_count"],
                "source_urls": " | ".join(source_urls) if source_urls else "None",
                "status_code": 200,
                "trace_id": "",
                "span_id": "",
                "generation_speed_tps": "",
                "error_message": "",
            }
        )

    return glean_rows


async def process_uploaded_master_csv(
    csv_text: str,
    project_id: Optional[str] = None,
    use_fallback_judge: bool = False,
    backup_dir: str = "src/eval_studio/backups",
) -> List[Dict[str, Any]]:
    effective_project = project_id or os.getenv("PROJECT_ID") or os.getenv("GCP_PROJECT")
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = []
    row_idx = 0

    for row in reader:
        row_idx += 1
        r_copy = dict(row)
        query = r_copy.get("query", "").strip()
        gt = r_copy.get("ground_truth", "").strip()
        resp_text = r_copy.get("response_text", "").strip()

        if not r_copy.get("agent_id"):
            r_copy["agent_id"] = "core_assistant" if r_copy.get("system") == "Gemini_Enterprise" else "N/A"
        if not r_copy.get("connectors_used"):
            r_copy["connectors_used"] = "Default Data Store" if r_copy.get("system") == "Gemini_Enterprise" else "Glean Web App"

        judge_pass_val = str(r_copy.get("judge_pass", "")).strip()
        if not judge_pass_val or judge_pass_val.lower() not in ["true", "false"]:
            if use_fallback_judge:
                acc = evaluate_accuracy(resp_text, gt)
                r_copy["judge_pass"] = acc
                r_copy["accuracy_pass"] = acc
                r_copy["judge_confidence"] = 1.0 if acc else 0.0
                r_copy["judge_reasoning"] = "Offline fallback substring evaluation."
            else:
                judge_res = await run_llm_judge(query, gt, resp_text, effective_project)
                r_copy["judge_pass"] = judge_res["judge_pass"]
                r_copy["accuracy_pass"] = judge_res["judge_pass"]
                r_copy["judge_confidence"] = judge_res["judge_confidence"]
                r_copy["judge_reasoning"] = judge_res["judge_reasoning"]

        if not r_copy.get("response_word_count"):
            r_copy["response_word_count"] = len(resp_text.split()) if resp_text else 0

        rows.append(r_copy)

    return rows


def merge_master_comparison_csv(
    ge_rows: List[Dict[str, Any]],
    glean_rows: List[Dict[str, Any]],
    output_csv_path: str,
) -> List[Dict[str, Any]]:
    existing_rows = []
    if output_csv_path and os.path.exists(output_csv_path):
        try:
            with open(output_csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                existing_rows = list(reader)
        except Exception:
            existing_rows = []

    if not ge_rows and existing_rows:
        ge_rows = [r for r in existing_rows if r.get("system") != "Glean_Web"]

    if not glean_rows and existing_rows:
        glean_rows = [r for r in existing_rows if r.get("system") == "Glean_Web"]

    merged_rows = []
    for r in ge_rows:
        row_copy = dict(r)
        if "system" not in row_copy:
            row_copy["system"] = "Gemini_Enterprise"
        merged_rows.append(row_copy)

    for r in glean_rows:
        row_copy = dict(r)
        if "system" not in row_copy:
            row_copy["system"] = "Glean_Web"
        merged_rows.append(row_copy)

    if output_csv_path:
        os.makedirs(os.path.dirname(os.path.abspath(output_csv_path)), exist_ok=True)
        with open(output_csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=MASTER_COMPARISON_FIELDNAMES, extrasaction="ignore")
            writer.writeheader()
            for row in merged_rows:
                writer.writerow(row)

    return merged_rows


async def evaluate_glean_baseline_batch(
    scenarios: List[Any],
    output_csv_path: Optional[str] = None,
    project_id: Optional[str] = None,
    use_fallback_judge: bool = False,
) -> List[Dict[str, Any]]:
    glean_rows = []
    for idx, s in enumerate(scenarios):
        q = getattr(s, "query", "")
        gt = getattr(s, "ground_truth", "")
        g_resp = getattr(s, "glean_response_text", "")
        g_urls = getattr(s, "glean_source_urls", "")
        exp_src = getattr(s, "expected_source", "") or getattr(s, "expected_sources", "")
        
        source_urls = _parse_url_list(g_urls)
        cit_metrics = evaluate_citations(source_urls, exp_src, response_text=g_resp)
        word_cnt = len(g_resp.split()) if g_resp else 0

        if use_fallback_judge:
            acc_pass = evaluate_accuracy(g_resp, gt)
            judge_res = {
                "judge_pass": acc_pass,
                "judge_confidence": 1.0 if acc_pass else 0.0,
                "judge_reasoning": "Offline fallback substring evaluation.",
            }
        else:
            judge_res = await run_llm_judge(q, gt, g_resp, project_id)

        glean_rows.append(
            {
                "run_id": f"glean_web_run_{idx+1}_{uuid.uuid4().hex[:4]}",
                "system": "Glean_Web",
                "model_id": "glean-default",
                "instruction_set": "N/A",
                "agent_id": "N/A",
                "connectors_used": "Glean Web App",
                "iteration": 1,
                "query": q,
                "ground_truth": gt,
                "response_text": g_resp.replace("\n", " ") if g_resp else "",
                "response_word_count": word_cnt,
                "accuracy_pass": judge_res["judge_pass"],
                "judge_pass": judge_res["judge_pass"],
                "judge_confidence": judge_res["judge_confidence"],
                "judge_reasoning": judge_res["judge_reasoning"],
                "ttft_sec": 0.0,
                "ttlt_sec": 0.0,
                "has_required_source": cit_metrics["has_required_source"],
                "total_sources_count": cit_metrics["total_sources_count"],
                "additional_sources_count": cit_metrics["additional_sources_count"],
                "source_urls": " | ".join(source_urls) if source_urls else "None",
                "status_code": 200,
                "trace_id": "",
                "span_id": "",
                "generation_speed_tps": "",
                "error_message": "",
            }
        )

    if output_csv_path:
        merge_master_comparison_csv([], glean_rows, output_csv_path)

    return glean_rows


class GleanEvaluationService:
    def __init__(self, project_id: Optional[str] = None):
        self.project_id = project_id

    async def evaluate_batch(
        self,
        scenarios: List[Any],
        output_csv_path: Optional[str] = None,
        use_fallback_judge: bool = False,
    ) -> List[Dict[str, Any]]:
        return await evaluate_glean_baseline_batch(
            scenarios=scenarios,
            output_csv_path=output_csv_path,
            project_id=self.project_id,
            use_fallback_judge=use_fallback_judge,
        )
