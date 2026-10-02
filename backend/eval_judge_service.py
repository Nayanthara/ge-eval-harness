#!/usr/bin/env python3
"""
Evaluation Service & CLI Suite for Gemini Enterprise streamAssist API.

This module acts as a facade and CLI entrypoint for:
- GCP Application Default Credentials (ge_eval_harness.backend.gcp_auth)
- 6-Tier Citation Attribution Matching (ge_eval_harness.backend.citation_matcher)
- Vertex AI LLM-as-a-Judge (ge_eval_harness.backend.llm_judge_service)
- streamAssist & Search API Client (ge_eval_harness.backend.stream_assist_client)
"""

import argparse
import asyncio
import csv
import os
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Ensure repository root is in sys.path
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from ge_eval_harness.config import bootstrap_environment
bootstrap_environment()

# --- Re-export all sub-service APIs for 100% Backwards Compatibility ---
from ge_eval_harness.backend.services.gcp_auth import (
    ADC_AUTH_ERROR_MESSAGE,
    get_gcp_credentials,
)
from ge_eval_harness.backend.services.citation_matcher import (
    TRACKING_QUERY_PARAMS,
    STOP_WORDS,
    GENERIC_ROUTING_TOKENS,
    CANONICAL_DOC_NAME_TO_URL,
    is_valid_source_identifier,
    _extract_drive_file_id,
    _normalize_url,
    _slugify,
    _extract_word_tokens,
    _extract_source_tokens,
    _match_single_source,
    _parse_expected_sources,
    evaluate_citations,
)
from ge_eval_harness.backend.services.llm_judge_service import (
    HAS_GENAI,
    normalize_text,
    parse_judge_json_response,
    evaluate_accuracy,
    run_llm_judge,
)
from ge_eval_harness.backend.services.stream_assist_client import (
    build_custom_preamble,
    extract_source_urls_from_chunks,
    extract_connectors_from_chunks,
    invoke_stream_assist_eval,
)
from ge_eval_harness.backend.services.discovery_inspector import export_detailed_evaluation_trace

console = Console()
REQUIRED_SOURCE_ID = os.getenv("DEFAULT_REQUIRED_SOURCE_ID", "")


async def run_evaluation_suite(
    project_id: str,
    engine_id: str,
    location: str,
    iterations: int,
    output_csv: str,
    debug: bool = False,
):
    """Runs the full evaluation matrix and writes the CSV report."""
    credentials, adc_project = get_gcp_credentials()
    effective_project = project_id or adc_project

    base_url = f"https://discoveryengine.googleapis.com/v1alpha/projects/{effective_project}/locations/{location}/collections/default_collection/engines/{engine_id}"
    endpoint_url = f"{base_url}/assistants/default_assistant:streamAssist"
    session_url = f"{base_url}/sessions"

    headers = {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json",
        "X-Goog-User-Project": effective_project,
    }

    models = ["gemini-3.5-flash", "gemini-3.1-pro"]
    instruction_sets = ["Default", "Custom"]

    total_runs = len(models) * len(instruction_sets) * iterations
    console.print(
        Panel.fit(
            f"[bold cyan]Starting Wellness Stipend Evaluation Suite[/bold cyan]\n"
            f"[bold]Project ID:[/bold] {effective_project}\n"
            f"[bold]Engine ID:[/bold] {engine_id}\n"
            f"[bold]Models:[/bold] {', '.join(models)}\n"
            f"[bold]Instruction Sets:[/bold] {', '.join(instruction_sets)}\n"
            f"[bold]Iterations per Cell:[/bold] {iterations} (Total API calls: {total_runs})\n"
            f"[bold]Output CSV:[/bold] {output_csv}",
            title="[bold yellow]Evaluation Protocol[/bold yellow]",
        )
    )

    results = []
    run_counter = 0

    async with httpx.AsyncClient(timeout=60.0) as client:
        for model_id in models:
            for instr_set in instruction_sets:
                for idx in range(iterations):
                    run_counter += 1
                    # Create a dedicated session for clean RAG context
                    session_name = None
                    try:
                        res_session = await client.post(
                            session_url,
                            json={"userPseudoId": f"eval-wellness-{uuid.uuid4().hex[:8]}"},
                            headers=headers,
                        )
                        if res_session.status_code == 200:
                            session_name = res_session.json().get("name")
                    except Exception:
                        pass

                    console.print(
                        f"[bold blue]({run_counter}/{total_runs})[/bold blue] "
                        f"Evaluating [bold cyan]{model_id}[/bold cyan] × [bold yellow]{instr_set}[/bold yellow] "
                        f"(Iter {idx+1}/{iterations})..."
                    )
                    row = await invoke_stream_assist_eval(
                        client=client,
                        endpoint_url=endpoint_url,
                        headers=headers,
                        model_id=model_id,
                        instruction_set=instr_set,
                        iteration_idx=idx,
                        session_name=session_name,
                        project_id=effective_project,
                        debug=debug,
                        query="What is the monthly wellness stipend amount for Yahoo full-time employees?",
                        ground_truth="$150 per month",
                        expected_source=REQUIRED_SOURCE_ID,
                        search_mode=os.environ.get("SEARCH_MODE", "Vector"),
                    )
                    results.append(row)
                    # Brief pause between iterations to respect API rate limits
                    await asyncio.sleep(1.0)

    # Write CSV spreadsheet
    os.makedirs(os.path.dirname(os.path.abspath(output_csv)), exist_ok=True)
    fieldnames = [
        "run_id",
        "model_id",
        "instruction_set",
        "agent_id",
        "connectors_used",
        "iteration",
        "query",
        "ground_truth",
        "response_text",
        "response_word_count",
        "accuracy_pass",
        "judge_pass",
        "judge_confidence",
        "judge_reasoning",
        "ttft_sec",
        "ttlt_sec",
        "has_required_source",
        "total_sources_count",
        "additional_sources_count",
        "source_urls",
        "status_code",
    ]

    with open(output_csv, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    console.print(
        f"\n[bold green]✅ Complete evaluation spreadsheet saved to:[/bold green] {output_csv}\n"
    )

    # Print executive Rich summary table
    summary_table = Table(title="[bold blue]Wellness Stipend Evaluation Summary (LLM-as-a-Judge)[/bold blue]")
    summary_table.add_column("Model", style="cyan", justify="left")
    summary_table.add_column("Instruction Set", style="yellow", justify="left")
    summary_table.add_column("Judge Pass (%)", style="green", justify="right")
    summary_table.add_column("Confidence", justify="right")
    summary_table.add_column("Mean Words", justify="right")
    summary_table.add_column("Mean TTFT (s)", justify="right")
    summary_table.add_column("Mean TTLT (s)", justify="right")
    summary_table.add_column("Req Source (%)", style="magenta", justify="right")
    summary_table.add_column("Mean Add'l Sources", justify="right")

    for model_id in models:
        for instr_set in instruction_sets:
            subset = [
                r
                for r in results
                if r["model_id"] == model_id and r["instruction_set"] == instr_set
            ]
            if not subset:
                continue
            n = len(subset)
            acc_pct = sum(1 for r in subset if r.get("judge_pass", r.get("accuracy_pass", False))) / n * 100
            mean_conf = sum(r.get("judge_confidence", 1.0) for r in subset) / n
            mean_words = sum(r["response_word_count"] for r in subset) / n
            mean_ttft = sum(r["ttft_sec"] for r in subset) / n
            mean_ttlt = sum(r["ttlt_sec"] for r in subset) / n
            req_src_pct = sum(1 for r in subset if r["has_required_source"]) / n * 100
            mean_add_src = sum(r["additional_sources_count"] for r in subset) / n

            summary_table.add_row(
                model_id,
                instr_set,
                f"{acc_pct:.1f}%",
                f"{mean_conf:.2f}",
                f"{mean_words:.1f}",
                f"{mean_ttft:.3f}",
                f"{mean_ttlt:.3f}",
                f"{req_src_pct:.1f}%",
                f"{mean_add_src:.1f}",
            )

    console.print(summary_table)


def main():
    parser = argparse.ArgumentParser(
        description="Run Wellness Stipend Evaluation Suite against Gemini Enterprise streamAssist API."
    )
    parser.add_argument(
        "--project-id",
        default=os.getenv("PROJECT_ID", ""),
        help="GCP Project ID",
    )
    parser.add_argument(
        "--engine-id",
        default=os.getenv("ENGINE_ID", ""),
        help="Discovery Engine ID",
    )
    parser.add_argument(
        "--location",
        default=os.getenv("LOCATION", "global"),
        help="GCP Location (default: global)",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=5,
        help="Number of test iterations per cell (default: 5)",
    )
    parser.add_argument(
        "--output-csv",
        default="src/eval_studio/wellness_stipend_eval_results.csv",
        help="Path to output CSV report",
    )
    parser.add_argument(
        "--debug", action="store_true", help="Print verbose debug JSON chunks"
    )
    args = parser.parse_args()

    asyncio.run(
        run_evaluation_suite(
            project_id=args.project_id,
            engine_id=args.engine_id,
            location=args.location,
            iterations=args.iterations,
            output_csv=args.output_csv,
            debug=args.debug,
        )
    )


if __name__ == "__main__":
    main()
