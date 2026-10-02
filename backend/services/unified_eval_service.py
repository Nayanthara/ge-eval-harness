#!/usr/bin/env python3
"""
Unified Evaluation Controller & Master Comparison Service for Gemini Enterprise Eval Harness.
Orchestrates protocol configuration, concurrent latency benchmarking, LLM-as-a-Judge grading,
AI Failure Diagnostics (Gemini 3.5 Flash), and 26-column CSV exports.
"""

import asyncio
import json
import os
import re
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from ge_eval_harness.backend.config import (
    ProtocolConfig,
    QueryScenarioConfig,
    expand_scenario_matrix,
)
from ge_eval_harness.backend.services.citation_matcher import (
    evaluate_citations,
)
from ge_eval_harness.backend.services.gcp_auth import (
    ADC_AUTH_ERROR_MESSAGE,
    get_gcp_credentials,
)
from ge_eval_harness.backend.services.llm_judge_service import (
    evaluate_accuracy,
    evaluate_evidence_grounding,
    evaluate_ground_truth_quality,
    run_llm_judge,
)
from ge_eval_harness.backend.services.glean_eval_service import (
    MASTER_COMPARISON_FIELDNAMES,
    merge_master_comparison_csv,
    _parse_url_list,
)
from ge_eval_harness.backend.services.latency_engine import (
    calculate_latency_stats,
    run_concurrent_api_benchmarks,
)
from ge_eval_harness.backend.services.trace_diagnostician import (
    compile_full_scenario_logs,
    diagnose_scenario_failure,
)
from ge_eval_harness.config.paths import PATHS

RUNS_DIR = str(PATHS.runs_dir)


def _safe_run_folder(runs_dir: str, run_id: str) -> Optional[str]:
    safe_id = os.path.basename(run_id).strip()
    if not re.match(r"^[a-zA-Z0-9_-]+$", safe_id):
        return None
    target = os.path.abspath(os.path.join(runs_dir, safe_id))
    if not target.startswith(runs_dir):
        return None
    return target


_ACTIVE_RUN_EVENTS_CACHE: Dict[str, List[Dict[str, Any]]] = {}
_RUN_LAST_ACTIVITY: Dict[str, float] = {}
_CACHE_LOCK = threading.Lock()


def _write_events_file_sync(filepath: str, events: list):
    try:
        tmp_path = filepath + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(events, f, indent=2)
        os.replace(tmp_path, filepath)
    except Exception:
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(events, f, indent=2)
        except Exception:
            pass


def log_run_event(run_id: Optional[str], step_name: str, status: str, info: str = ""):
    if not run_id:
        return
    runs_dir = RUNS_DIR
    run_folder = _safe_run_folder(runs_dir, run_id)
    if not run_folder:
        return
    os.makedirs(run_folder, exist_ok=True)
    events_file = os.path.join(run_folder, "events_log.json")

    event_entry = {
        "step": step_name,
        "status": status,
        "time": datetime.now().strftime("%H:%M:%S"),
        "info": info
    }

    with _CACHE_LOCK:
        if run_id not in _ACTIVE_RUN_EVENTS_CACHE:
            initial_events = []
            if os.path.exists(events_file):
                try:
                    with open(events_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, list):
                            initial_events = data
                except Exception:
                    pass
            _ACTIVE_RUN_EVENTS_CACHE[run_id] = initial_events
        _ACTIVE_RUN_EVENTS_CACHE[run_id].append(event_entry)
        _RUN_LAST_ACTIVITY[run_id] = time.time()
        events_snapshot = list(_ACTIVE_RUN_EVENTS_CACHE[run_id])

    try:
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, _write_events_file_sync, events_file, events_snapshot)
    except RuntimeError:
        threading.Thread(target=_write_events_file_sync, args=(events_file, events_snapshot), daemon=True).start()


def get_run_events(run_id: str) -> List[Dict[str, Any]]:
    if not run_id:
        return []
    with _CACHE_LOCK:
        if run_id in _ACTIVE_RUN_EVENTS_CACHE:
            return list(_ACTIVE_RUN_EVENTS_CACHE[run_id])
    runs_dir = RUNS_DIR
    run_folder = _safe_run_folder(runs_dir, run_id)
    if not run_folder:
        return []
    events_file = os.path.join(run_folder, "events_log.json")
    if os.path.exists(events_file):
        try:
            with open(events_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    with _CACHE_LOCK:
                        _ACTIVE_RUN_EVENTS_CACHE[run_id] = data
                    return data
        except Exception:
            pass
    return []


def cleanup_stale_cached_runs(max_age_seconds: float = 600.0) -> int:
    """
    Evicts inactive/completed runs from in-memory cache to prevent memory growth.
    Retains runs for up to max_age_seconds after last recorded activity.
    """
    now = time.time()
    evicted_count = 0
    with _CACHE_LOCK:
        stale_ids = [
            rid for rid, last_time in _RUN_LAST_ACTIVITY.items()
            if (now - last_time) > max_age_seconds
        ]
        for rid in stale_ids:
            _ACTIVE_RUN_EVENTS_CACHE.pop(rid, None)
            _RUN_LAST_ACTIVITY.pop(rid, None)
            evicted_count += 1
    return evicted_count


async def _execute_unified_evaluation_core(
    protocol_config: ProtocolConfig,
    scenarios: List[QueryScenarioConfig],
    output_csv_path: Optional[str] = None,
    use_fallback_judge: bool = False,
    project_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Core evaluation execution pipeline."""
    # Phase 1: Initialization
    log_run_event(run_id, "Initialization", "running", "Validating GCP credentials and expanding scenario Cartesian matrix...")
    try:
        get_gcp_credentials()
    except Exception as e:
        log_run_event(run_id, "Initialization", "failed", f"GCP ADC validation failed: {e}")
        raise

    expanded = expand_scenario_matrix(protocol_config, scenarios)
    models_str = ", ".join(protocol_config.models)
    instructions_str = ", ".join(protocol_config.instruction_sets)
    search_mode_str = getattr(protocol_config, "search_mode", os.getenv("SEARCH_MODE", "Vector"))
    company_name_str = getattr(protocol_config, "company_name", os.getenv("COMPANY_NAME", "Yahoo"))
    
    log_run_event(
        run_id,
        "Initialization",
        "completed",
        f"Configured {len(scenarios)} query scenarios × {len(protocol_config.models)} models ({models_str}) × {len(protocol_config.instruction_sets)} instructions ({instructions_str}) × {protocol_config.iterations} iterations = {len(expanded)} total evaluation cells (Search Mode: {search_mode_str}, Company: {company_name_str})."
    )

    # Phase 2: REST API Benchmarks
    concurrency_val = getattr(protocol_config, "concurrency_limit", getattr(protocol_config, "max_concurrent_calls", 25))
    log_run_event(
        run_id,
        "REST API Benchmarks",
        "running",
        f"Executing {len(expanded)} concurrent streamAssist / Vector Search calls (concurrency={concurrency_val}, pacing delay={getattr(protocol_config, 'pacing_delay_sec', 0.0)}s)..."
    )

    t_bench_start = time.perf_counter()
    api_results = await run_concurrent_api_benchmarks(
        scenarios=expanded,
        max_concurrent_calls=concurrency_val,
        pacing_delay_sec=getattr(protocol_config, "pacing_delay_sec", 0.0),
    )
    t_bench_elapsed = round(time.perf_counter() - t_bench_start, 2)

    http_status_summary = {}
    for r in api_results:
        st = r.get("status_code", 200)
        http_status_summary[st] = http_status_summary.get(st, 0) + 1

    status_str = ", ".join([f"HTTP {k}: {v}" for k, v in sorted(http_status_summary.items())])
    log_run_event(
        run_id,
        "REST API Benchmarks",
        "completed",
        f"Finished {len(api_results)} API calls in {t_bench_elapsed}s. Status breakdown: {status_str}."
    )

    # Phase 3: LLM Judge Evaluation
    log_run_event(
        run_id,
        "LLM Judge Evaluation",
        "running",
        f"Grading {len(api_results)} responses with Gemini 3.1 Pro LLM-as-a-Judge and 6-tier citation matcher..."
    )

    async def _evaluate_single_record(idx: int, cell: Dict[str, Any]) -> Dict[str, Any]:
        res = api_results[idx]
        query_str = cell.get("query", "")
        ground_truth = cell.get("ground_truth", "")
        exp_source = cell.get("expected_source", "") or cell.get("expected_sources", "") or cell.get("description", "")
        resp_text = res.get("response_text", "")
        word_count = res.get("response_word_count", len(resp_text.split()))

        t_judge_start = time.perf_counter()
        row_connectors = cell.get("connector_id") or cell.get("connector") or "all"

        # Concurrent Execution: Run Candidate LLM Judge and Ground Truth Quality Audit in parallel
        if use_fallback_judge:
            acc_pass = evaluate_accuracy(resp_text, ground_truth)
            judge = {
                "judge_pass": acc_pass,
                "judge_confidence": 1.0 if acc_pass else 0.0,
                "judge_reasoning": "Offline fallback substring evaluation.",
            }
            gt_quality_res = await evaluate_ground_truth_quality(
                query=query_str,
                ground_truth=ground_truth,
                expected_sources=exp_source,
                project_id=project_id,
                use_fallback=True,
                session_docs=None,
                connector_ids=row_connectors,
            )
        else:
            session_grounding_docs = res.get("retrieved_documents") or []
            judge, gt_quality_res = await asyncio.gather(
                run_llm_judge(query_str, ground_truth, resp_text, project_id),
                evaluate_ground_truth_quality(
                    query=query_str,
                    ground_truth=ground_truth,
                    expected_sources=exp_source,
                    project_id=project_id,
                    use_fallback=False,
                    session_docs=session_grounding_docs,
                    connector_ids=row_connectors,
                ),
            )

        judge_ttlt_sec = round(time.perf_counter() - t_judge_start, 3)

        source_urls_raw = res.get("source_urls", "None")
        if isinstance(source_urls_raw, list):
            source_urls = [str(u).strip() for u in source_urls_raw if str(u).strip() and str(u).strip() != "None"]
        elif isinstance(source_urls_raw, str):
            source_urls = [u.strip() for u in source_urls_raw.split(" | ") if u.strip() and u.strip() != "None"]
        else:
            source_urls = []

        cit_metrics = evaluate_citations(source_urls, exp_source, response_text=resp_text)

        has_req_source = cit_metrics.get("has_required_source", False)
        evidence_match = has_req_source
        evidence_quote = ""
        evidence_reasoning = "Exact golden reference matched." if has_req_source else ""

        # Content-level Semantic Evidence Grounding Check
        if not has_req_source and judge.get("judge_pass", False):
            retrieved_docs = res.get("retrieved_documents", [])
            ev_res = await evaluate_evidence_grounding(
                query=query_str,
                ground_truth=ground_truth,
                response_text=resp_text,
                retrieved_documents=retrieved_docs,
                source_urls=source_urls,
                project_id=project_id,
                use_fallback=use_fallback_judge,
            )
            evidence_match = ev_res.get("evidence_match", False)
            evidence_quote = ev_res.get("supporting_quote", "")
            evidence_reasoning = ev_res.get("reasoning", "")

        gt_source_quality = gt_quality_res.get("gt_source_quality", "STRONG")
        gt_quality_confidence = gt_quality_res.get("gt_quality_confidence", 0.95)
        gt_quality_reasoning = gt_quality_res.get("gt_quality_reasoning", "Authoritative golden reference specified.")

        search_mode_val = cell.get("search_mode") or os.getenv("SEARCH_MODE", "Vector")
        company_name_val = cell.get("company_name") or os.getenv("COMPANY_NAME", "Yahoo")
        is_vector = (str(search_mode_val).strip().lower() == "vector")

        rec = {
            "run_id": cell.get("run_id", f"run_{idx}"),
            "system": "Gemini_Enterprise",
            "model_id": cell.get("model_id", "gemini-3.5-flash"),
            "instruction_set": cell.get("instruction_set", "Default"),
            "agent_id": "N/A (Vector Search)" if is_vector else cell.get("agent_id", "core_assistant"),
            "search_mode": "Vector" if is_vector else "Agentic",
            "company_name": company_name_val,
            "connectors_used": cell.get("connectors_used") or cell.get("connector_id") or os.getenv("CONNECTOR_ID", "all"),
            "iteration": cell.get("iteration", 1),
            "query": query_str,
            "ground_truth": ground_truth,
            "response_text": resp_text,
            "response_word_count": word_count,
            "accuracy_pass": judge.get("judge_pass", True),
            "judge_pass": judge.get("judge_pass", True),
            "judge_confidence": judge.get("judge_confidence", 1.0),
            "judge_reasoning": judge.get("judge_reasoning", "Verified by unified service."),
            "ttft_sec": res.get("ttft_sec", 0.0),
            "ttlt_sec": res.get("ttlt_sec", 0.0),
            "judge_ttlt_sec": judge_ttlt_sec,
            "has_required_source": has_req_source,
            "evidence_match": evidence_match,
            "evidence_quote": evidence_quote,
            "evidence_reasoning": evidence_reasoning,
            "gt_source_quality": gt_source_quality,
            "gt_quality_confidence": gt_quality_confidence,
            "gt_quality_reasoning": gt_quality_reasoning,
            "audited_sources": gt_quality_res.get("audited_sources", []),
            "gt_audit_telemetry": gt_quality_res.get("audit_telemetry", {}),
            "all_expected_matched": cit_metrics.get("all_expected_matched", False),
            "matched_sources_count": cit_metrics.get("matched_sources_count", 0),
            "expected_sources_count": cit_metrics.get("expected_sources_count", 0),
            "source_match_coverage": cit_metrics.get("source_match_coverage", 0.0),
            "total_sources_count": cit_metrics.get("total_sources_count", len(source_urls)),
            "additional_sources_count": cit_metrics.get("additional_sources_count", 0),
            "expected_source": exp_source,
            "glean_response_text": cell.get("glean_response_text", ""),
            "glean_source_urls": cell.get("glean_source_urls", ""),
            "source_urls": source_urls,
            "status_code": res.get("status_code", 200),
            "retry_count": res.get("retry_count", 0),
            "total_attempts": res.get("total_attempts", 1),
            "status_code_history": res.get("status_code_history", [res.get("status_code", 200)]),
            "trace_id": res.get("trace_id", ""),
            "span_id": res.get("span_id", ""),
            "assist_token": res.get("assist_token", ""),
            "answer_name": res.get("answer_name", ""),
            "session_name": res.get("session_name", ""),
            "retrieved_documents": res.get("retrieved_documents", []),
            "tool_calls": res.get("tool_calls", []),
            "raw_chunks": res.get("raw_chunks", []),
            "generation_speed_tps": res.get("generation_speed_tps", 0.0),
            "error_message": res.get("error_message", ""),
        }
        return rec

    judge_tasks = [_evaluate_single_record(idx, cell) for idx, cell in enumerate(expanded)]
    records = list(await asyncio.gather(*judge_tasks))

    judge_ttlts = [float(r["judge_ttlt_sec"]) for r in records if "judge_ttlt_sec" in r and isinstance(r["judge_ttlt_sec"], (int, float))]
    judge_stats = calculate_latency_stats(judge_ttlts)
    ge_passes = sum(1 for r in records if r.get("judge_pass") in (True, "True"))
    ge_pass_rate = (ge_passes / len(records) * 100.0) if records else 0.0
    cit_passes = sum(1 for r in records if r.get("has_required_source") in (True, "True"))
    cit_rate = (cit_passes / len(records) * 100.0) if records else 0.0
    ev_passes = sum(1 for r in records if r.get("evidence_match") in (True, "True"))
    ev_rate = (ev_passes / len(records) * 100.0) if records else 0.0

    log_run_event(
        run_id,
        "LLM Judge Evaluation",
        "completed",
        f"Evaluation complete: GE Factuality {ge_passes}/{len(records)} ({ge_pass_rate:.1f}%) | Citation Match {cit_passes}/{len(records)} ({cit_rate:.1f}%) | Evidence Match {ev_passes}/{len(records)} ({ev_rate:.1f}%) | Judge TTLT: p50={judge_stats['p50']:.2f}s, p95={judge_stats['p95']:.2f}s, max={judge_stats['max']:.2f}s."
    )

    # Phase 4: AI Failure Diagnostics (Gemini 3.5 Flash)
    log_run_event(
        run_id,
        "AI Failure Diagnostics",
        "running",
        "Analyzing scenario traces with Gemini 3.5 Flash failure diagnostician..."
    )

    failed_records = []
    clean_records = []
    for r in records:
        j_pass = (r.get("judge_pass") in (True, "True") or r.get("accuracy_pass") in (True, "True"))
        c_pass = (r.get("has_required_source") in (True, "True"))
        s_ok = (int(r.get("status_code", 200)) == 200)
        if j_pass and c_pass and s_ok:
            clean_records.append(r)
        else:
            failed_records.append(r)

    # Parallel diagnostic evaluation for failed records
    async def _diagnose_single(rec: Dict[str, Any]):
        diag = await diagnose_scenario_failure(rec, project_id=project_id, use_fallback=use_fallback_judge)
        full_logs = compile_full_scenario_logs(rec)
        rec["ai_diagnosis"] = diag
        rec["trace_logs"] = full_logs
        return rec

    async def _populate_clean(rec: Dict[str, Any]):
        diag = await diagnose_scenario_failure(rec, project_id=project_id, use_fallback=use_fallback_judge)
        full_logs = compile_full_scenario_logs(rec)
        rec["ai_diagnosis"] = diag
        rec["trace_logs"] = full_logs
        return rec

    if failed_records:
        await asyncio.gather(*[_diagnose_single(r) for r in failed_records])
    if clean_records:
        await asyncio.gather(*[_populate_clean(r) for r in clean_records])

    log_run_event(
        run_id,
        "AI Failure Diagnostics",
        "completed",
        f"Diagnostics complete: Analyzed {len(failed_records)} failed scenario(s) with Gemini 3.5 Flash | {len(clean_records)} scenario(s) passed cleanly."
    )

    # Optional Glean baseline records
    glean_records = []
    glean_idx = 0
    for s in scenarios:
        g_resp = getattr(s, "glean_response_text", "").strip()
        if g_resp:
            glean_idx += 1
            query_str = s.query
            ground_truth = s.ground_truth
            g_urls_raw = getattr(s, "glean_source_urls", "")
            source_urls = _parse_url_list(g_urls_raw)
            
            t_gjudge_start = time.perf_counter()
            if use_fallback_judge:
                acc_pass = evaluate_accuracy(g_resp, ground_truth)
                judge = {
                    "judge_pass": acc_pass,
                    "judge_confidence": 1.0 if acc_pass else 0.0,
                    "judge_reasoning": "Offline fallback substring evaluation.",
                }
            else:
                judge = await run_llm_judge(query_str, ground_truth, g_resp, project_id)
            g_judge_ttlt_sec = round(time.perf_counter() - t_gjudge_start, 3)
                
            exp_source = getattr(s, "expected_source", "") or getattr(s, "expected_sources", "") or getattr(s, "description", "")
            cit_metrics = evaluate_citations(source_urls, exp_source, response_text=g_resp)
            word_count = len(g_resp.split())
            
            rec = {
                "run_id": f"glean_web_run_{glean_idx}_{run_id[-4:] if run_id else 'temp'}",
                "system": "Glean_Web",
                "model_id": "glean-default",
                "instruction_set": "N/A",
                "agent_id": "N/A",
                "connectors_used": "Glean Web App",
                "iteration": 1,
                "query": query_str,
                "ground_truth": ground_truth,
                "response_text": g_resp,
                "response_word_count": word_count,
                "accuracy_pass": judge.get("judge_pass", True),
                "judge_pass": judge.get("judge_pass", True),
                "judge_confidence": judge.get("judge_confidence", 1.0),
                "judge_reasoning": judge.get("judge_reasoning", "Verified by unified service."),
                "ttft_sec": 0.0,
                "ttlt_sec": 0.0,
                "judge_ttlt_sec": g_judge_ttlt_sec,
                "has_required_source": cit_metrics.get("has_required_source", True),
                "all_expected_matched": cit_metrics.get("all_expected_matched", True),
                "matched_sources_count": cit_metrics.get("matched_sources_count", 0),
                "expected_sources_count": cit_metrics.get("expected_sources_count", 0),
                "source_match_coverage": cit_metrics.get("source_match_coverage", 1.0),
                "total_sources_count": cit_metrics.get("total_sources_count", len(source_urls)),
                "additional_sources_count": cit_metrics.get("additional_sources_count", 0),
                "expected_source": exp_source,
                "glean_response_text": g_resp,
                "glean_source_urls": g_urls_raw,
                "source_urls": " | ".join(source_urls) if source_urls else "None",
                "status_code": 200,
                "retry_count": 0,
                "total_attempts": 1,
                "status_code_history": [200],
                "trace_id": "",
                "span_id": "",
                "generation_speed_tps": 0.0,
                "error_message": "",
            }
            glean_records.append(rec)

    ttfts = [float(r["ttft_sec"]) for r in records if "ttft_sec" in r and isinstance(r["ttft_sec"], (int, float))]
    ttlts = [float(r["ttlt_sec"]) for r in records if "ttlt_sec" in r and isinstance(r["ttlt_sec"], (int, float))]
    tps_vals = [float(r["generation_speed_tps"]) for r in records if "generation_speed_tps" in r and isinstance(r["generation_speed_tps"], (int, float))]

    api_stats = calculate_latency_stats(ttlts)

    latency_summary = {
        "ttft_sec": calculate_latency_stats(ttfts),
        "ttlt_sec": api_stats,
        "eval_api_ttlt": api_stats,
        "llm_judge_ttlt": judge_stats,
        "generation_speed_tps": calculate_latency_stats(tps_vals),
        "judge_ttlt_sec": judge_stats,
        "http_status_summary": http_status_summary,
    }

    combined_records = records + glean_records

    # Phase 5: Persistence
    if output_csv_path:
        log_run_event(run_id, "Persistence", "running", f"Writing {len(combined_records)} records to master CSV at {os.path.basename(output_csv_path)}...")
        merge_master_comparison_csv(
            ge_rows=records,
            glean_rows=glean_records,
            output_csv_path=output_csv_path,
        )
        
        file_size_kb = 0
        if run_id:
            try:
                runs_dir = RUNS_DIR
                run_folder = _safe_run_folder(runs_dir, run_id)
                if run_folder:
                    results_file = os.path.join(run_folder, "results.json")
                    with open(results_file, "w") as f:
                        json.dump(combined_records, f, indent=2)
                    file_size_kb = round(os.path.getsize(results_file) / 1024, 1)
            except Exception:
                pass

        log_run_event(
            run_id,
            "Persistence",
            "completed",
            f"Results persisted: Saved {len(combined_records)} records with full traces and failure diagnostics ({file_size_kb} KB)."
        )

    return {
        "records": combined_records,
        "latency_summary": latency_summary,
        "output_csv_path": output_csv_path,
    }


async def execute_unified_evaluation(
    protocol_config: ProtocolConfig,
    scenarios: List[QueryScenarioConfig],
    output_csv_path: Optional[str] = None,
    use_fallback_judge: bool = False,
    project_id: Optional[str] = None,
    run_id: Optional[str] = None,
) -> Dict[str, Any]:
    run_timeout = float(getattr(protocol_config, "run_timeout_sec", 600.0))
    try:
        return await asyncio.wait_for(
            _execute_unified_evaluation_core(
                protocol_config=protocol_config,
                scenarios=scenarios,
                output_csv_path=output_csv_path,
                use_fallback_judge=use_fallback_judge,
                project_id=project_id,
                run_id=run_id,
            ),
            timeout=run_timeout
        )
    except asyncio.TimeoutError as e:
        log_run_event(run_id, "Overall Run Execution", "failed", f"Overall run timed out after exceeding the limit of {run_timeout}s.")
        raise RuntimeError(f"Evaluation run timed out after {run_timeout}s.") from e


run_unified_evaluation = execute_unified_evaluation
