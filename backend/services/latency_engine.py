#!/usr/bin/env python3
"""
High-Concurrency Async Latency & Throughput Benchmarking Engine for Gemini Enterprise Eval Harness.
Bounded by asyncio.Semaphore to prevent API rate-limiting while measuring TTFT, TTLT, TPS, and percentiles.
"""

import asyncio
import math
import os
import random
import sys
import uuid
from pathlib import Path
import time
from typing import Any, Callable, Dict, List, Optional
import httpx

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from ge_eval_harness.config import bootstrap_environment
bootstrap_environment()

from ge_eval_harness.backend.services.discovery_inspector import (
    generate_w3c_traceparent,
    export_detailed_evaluation_trace,
)

TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504, 408}


def calculate_latency_stats(data: List[float]) -> Dict[str, float]:
    """
    Computes statistical percentiles (min, p50, p90, p95, p99, max, avg) for numeric latency arrays.
    Returns zeroed dictionary for empty inputs.
    """
    if not data:
        return {
            "min": 0.0,
            "p50": 0.0,
            "p90": 0.0,
            "p95": 0.0,
            "p99": 0.0,
            "max": 0.0,
            "avg": 0.0,
        }

    sorted_data = sorted(data)
    n = len(sorted_data)

    def _percentile(p: float) -> float:
        if n == 1:
            return sorted_data[0]
        idx = (n - 1) * p
        lower = math.floor(idx)
        upper = math.ceil(idx)
        weight = idx - lower
        return sorted_data[lower] * (1 - weight) + sorted_data[upper] * weight

    return {
        "min": round(sorted_data[0], 3),
        "p50": round(_percentile(0.50), 3),
        "p90": round(_percentile(0.90), 3),
        "p95": round(_percentile(0.95), 3),
        "p99": round(_percentile(0.99), 3),
        "max": round(sorted_data[-1], 3),
        "avg": round(sum(sorted_data) / n, 3),
    }


async def execute_stream_assist_call(
    scenario: Dict[str, Any],
    client: Optional[httpx.AsyncClient] = None,
) -> Dict[str, Any]:
    """
    Executes a real Google Cloud Discovery Engine streamAssist streaming call, capturing TTFT, TTLT, TPS,
    and W3C traceparent headers with resilient retry loops, dynamic timeout budgeting, and status code telemetry.
    """
    from ge_eval_harness.backend.services.discovery_inspector import generate_w3c_traceparent
    import ge_eval_harness.backend.eval_judge_service as eval_judge_service

    trace_info = generate_w3c_traceparent()
    query = scenario.get("query", "")
    ground_truth = scenario.get("ground_truth", "")
    model_id = scenario.get("model_id", "gemini-3.5-flash")
    instruction_set = scenario.get("instruction_set", "Default")

    project_id = os.getenv("PROJECT_ID", "")
    location = os.getenv("LOCATION", "global")
    engine_id = os.getenv("ENGINE_ID", "")

    credentials, adc_project = eval_judge_service.get_gcp_credentials()
    effective_project = project_id or adc_project

    headers = {
        "x-goog-user-project": effective_project,
        "traceparent": trace_info["traceparent"],
    }
    if credentials and getattr(credentials, "token", None):
        headers["Authorization"] = f"Bearer {credentials.token}"

    endpoint_url = (
        f"https://discoveryengine.googleapis.com/v1alpha/projects/{effective_project}"
        f"/locations/{location}/collections/default_collection/engines/{engine_id}"
        f"/assistants/default_assistant:streamAssist"
    )

    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json",
        "X-Goog-User-Project": effective_project,
        "traceparent": f"00-{trace_info['trace_id']}-{trace_info['span_id']}-01",
    }

    async def _provision_session(http_client: Optional[httpx.AsyncClient] = None) -> Optional[str]:
        try:
            session_url = (
                f"https://discoveryengine.googleapis.com/v1alpha/projects/{effective_project}/"
                f"locations/{location}/collections/default_collection/engines/{engine_id}/sessions"
            )
            pseudo_id = f"eval-user-{uuid.uuid4().hex}"
            if http_client is not None:
                res_sess = await http_client.post(session_url, json={"userPseudoId": pseudo_id}, headers=headers)
            else:
                async with httpx.AsyncClient(timeout=10.0) as temp_client:
                    res_sess = await temp_client.post(session_url, json={"userPseudoId": pseudo_id}, headers=headers)
            if res_sess.status_code == 200:
                return res_sess.json().get("name")
        except Exception:
            pass
        return None

    configured_session = scenario.get("session") or scenario.get("session_name")
    session_name = configured_session or await _provision_session(client)

    scenario_timeout = float(scenario.get("scenario_timeout_sec", 90.0))
    max_attempts = int(scenario.get("max_retries", 3))
    t_start = time.perf_counter()

    status_code_history = []
    last_res = None
    last_error = None

    api_timeout_sec = float(scenario.get("api_timeout_sec", 30.0))

    for attempt in range(max_attempts):
        elapsed = time.perf_counter() - t_start
        remaining_budget = scenario_timeout - elapsed
        if remaining_budget < 5.0 and attempt > 0:
            break

        attempt_timeout = max(5.0, min(api_timeout_sec, remaining_budget))

        if not credentials.valid or getattr(credentials, "expired", False) or not getattr(credentials, "token", None):
            try:
                from google.auth.transport.requests import Request
                credentials.refresh(Request())
                headers["Authorization"] = f"Bearer {credentials.token}"
            except Exception:
                pass

        if attempt > 0 and not configured_session:
            session_name = await _provision_session(client)

        async def _invoke_with_client(http_client: httpx.AsyncClient, cur_timeout: float):
            return await asyncio.wait_for(
                eval_judge_service.invoke_stream_assist_eval(
                    client=http_client,
                    endpoint_url=endpoint_url,
                    headers=headers,
                    model_id=model_id,
                    instruction_set=instruction_set,
                    iteration_idx=0,
                    session_name=session_name,
                    project_id=effective_project,
                    query=query,
                    ground_truth=ground_truth,
                    custom_system_instruction=scenario.get("custom_system_instruction", ""),
                    connector_id=scenario.get("connectors_used", "all"),
                    expected_source=scenario.get("expected_source", ""),
                    answer_generation_mode=scenario.get("answer_generation_mode", "NORMAL"),
                    assist_skipping_mode=scenario.get("assist_skipping_mode", "REQUEST_ASSIST"),
                    search_result_mode=scenario.get("search_result_mode", "CHUNKS"),
                    search_mode=scenario.get("search_mode", os.environ.get("SEARCH_MODE", "Vector")),
                    company_name=scenario.get("company_name", os.environ.get("COMPANY_NAME", "Yahoo")),
                ),
                timeout=cur_timeout,
            )

        try:
            if client is not None:
                res = await _invoke_with_client(client, attempt_timeout)
            else:
                timeout_cfg = httpx.Timeout(connect=15.0, read=attempt_timeout, write=15.0, pool=30.0)
                async with httpx.AsyncClient(timeout=timeout_cfg) as local_client:
                    res = await _invoke_with_client(local_client, attempt_timeout)

            status = res.get("status_code", 200)
            status_code_history.append(status)

            if status == 200 and not res.get("error_message"):
                res = dict(res)
                res["retry_count"] = attempt
                res["total_attempts"] = attempt + 1
                res["status_code_history"] = status_code_history
                res["trace_id"] = trace_info["trace_id"]
                res["span_id"] = trace_info["span_id"]
                res["query"] = query
                res["ground_truth"] = ground_truth
                res["session_name"] = session_name
                return res

            last_res = res
            last_error = res.get("error_message")

            if status == 401:
                try:
                    from google.auth.transport.requests import Request
                    credentials.refresh(Request())
                    headers["Authorization"] = f"Bearer {credentials.token}"
                except Exception:
                    pass

            elif status not in TRANSIENT_STATUS_CODES:
                res = dict(res)
                res["retry_count"] = attempt
                res["total_attempts"] = attempt + 1
                res["status_code_history"] = status_code_history
                res["trace_id"] = trace_info["trace_id"]
                res["span_id"] = trace_info["span_id"]
                res["query"] = query
                res["ground_truth"] = ground_truth
                res["session_name"] = session_name
                return res

        except (asyncio.TimeoutError, httpx.ReadTimeout, httpx.ConnectError) as e:
            status_code_history.append(408)
            last_error = f"Attempt {attempt + 1} timed out after {attempt_timeout:.1f}s ({str(e)})"
            last_res = {
                "run_id": scenario.get("run_id", f"run_{model_id}_{instruction_set}_1"),
                "model_id": model_id,
                "instruction_set": instruction_set,
                "iteration": 1,
                "query": query,
                "ground_truth": ground_truth,
                "response_text": f"Timeout: streamAssist request exceeded {attempt_timeout:.1f}s timeout limit.",
                "response_word_count": 0,
                "accuracy_pass": False,
                "ttft_sec": attempt_timeout,
                "ttlt_sec": attempt_timeout,
                "has_required_source": False,
                "total_sources_count": 0,
                "additional_sources_count": 0,
                "source_urls": "None",
                "status_code": 408,
                "generation_speed_tps": 0.0,
                "error_message": last_error,
            }

        if attempt < max_attempts - 1:
            backoff = (1.5 * (2 ** attempt)) + random.uniform(0.1, 1.2)
            if (time.perf_counter() - t_start) + backoff < scenario_timeout - 4.0:
                await asyncio.sleep(backoff)
            else:
                break

    if last_res is None:
        last_res = {
            "run_id": scenario.get("run_id", f"run_{model_id}_{instruction_set}_1"),
            "model_id": model_id,
            "instruction_set": instruction_set,
            "iteration": 1,
            "query": query,
            "ground_truth": ground_truth,
            "response_text": f"Timeout: streamAssist request exhausted all {max_attempts} attempts within {scenario_timeout}s.",
            "response_word_count": 0,
            "accuracy_pass": False,
            "ttft_sec": scenario_timeout,
            "ttlt_sec": scenario_timeout,
            "has_required_source": False,
            "total_sources_count": 0,
            "additional_sources_count": 0,
            "source_urls": "None",
            "status_code": 408,
            "generation_speed_tps": 0.0,
            "error_message": last_error or f"Exceeded {scenario_timeout}s scenario timeout.",
        }

    res = dict(last_res)
    res["retry_count"] = max(0, len(status_code_history) - 1)
    res["total_attempts"] = len(status_code_history)
    res["status_code_history"] = status_code_history
    res["trace_id"] = trace_info["trace_id"]
    res["span_id"] = trace_info["span_id"]
    res["query"] = query
    res["ground_truth"] = ground_truth
    res["session_name"] = session_name
    return res


async def run_concurrent_api_benchmarks(
    scenarios: List[Dict[str, Any]],
    max_concurrent_calls: int = 50,
    max_qps: Optional[float] = None,
    call_fn: Optional[Callable] = None,
    pacing_delay_sec: float = 0.0,
    shared_client: Optional[httpx.AsyncClient] = None,
    on_progress: Optional[Callable[[int, int], None]] = None,
) -> List[Dict[str, Any]]:
    semaphore = asyncio.Semaphore(max_concurrent_calls)
    target_fn = call_fn or execute_stream_assist_call

    max_api_timeout = max(
        [float(s.get("api_timeout_sec", 60.0)) for s in scenarios] or [60.0]
    )

    completed_count = 0
    progress_lock = asyncio.Lock()

    dispatch_interval = 0.0
    if max_qps is not None and max_qps > 0:
        dispatch_interval = 1.0 / max_qps
    elif pacing_delay_sec > 0:
        dispatch_interval = pacing_delay_sec

    async def _execute_all(client: Optional[httpx.AsyncClient]):
        async def _worker(scen: Dict[str, Any], index: int) -> Dict[str, Any]:
            nonlocal completed_count
            if dispatch_interval > 0 and index > 0:
                launch_delay = (index * dispatch_interval) + random.uniform(0.005, 0.025)
                await asyncio.sleep(min(launch_delay, 2.0))

            async with semaphore:
                scenario_timeout = float(scen.get("scenario_timeout_sec", 90.0))
                try:
                    try:
                        res = await asyncio.wait_for(
                            target_fn(scen, client=client), timeout=scenario_timeout
                        )
                    except TypeError:
                        res = await asyncio.wait_for(
                            target_fn(scen), timeout=scenario_timeout
                        )
                except asyncio.TimeoutError:
                    res = {
                        "run_id": scen.get("run_id", ""),
                        "ttft_sec": scenario_timeout,
                        "ttlt_sec": scenario_timeout,
                        "response_text": f"Timeout: Scenario execution exceeded {scenario_timeout}s timeout limit.",
                        "response_word_count": 0,
                        "generation_speed_tps": 0.0,
                        "trace_id": "",
                        "span_id": "",
                        "error_message": f"Scenario execution timed out after {scenario_timeout}s.",
                        "status_code": 408,
                    }
                except Exception as e:
                    res = {
                        "run_id": scen.get("run_id", ""),
                        "ttft_sec": 0.0,
                        "ttlt_sec": 0.0,
                        "response_text": "",
                        "response_word_count": 0,
                        "generation_speed_tps": 0.0,
                        "trace_id": "",
                        "span_id": "",
                        "error_message": str(e),
                        "status_code": 500,
                    }

            async with progress_lock:
                completed_count += 1
                if on_progress:
                    try:
                        on_progress(completed_count, len(scenarios))
                    except Exception:
                        pass
            return res

        tasks = [_worker(s, i) for i, s in enumerate(scenarios)]
        return await asyncio.gather(*tasks)

    if shared_client is not None:
        return await _execute_all(shared_client)
    else:
        limits = httpx.Limits(
            max_connections=max(150, len(scenarios) * 2),
            max_keepalive_connections=max(75, len(scenarios)),
        )
        timeout_cfg = httpx.Timeout(
            connect=15.0, read=max_api_timeout, write=15.0, pool=30.0
        )
        async with httpx.AsyncClient(
            timeout=timeout_cfg, limits=limits
        ) as client_pool:
            return await _execute_all(client_pool)
