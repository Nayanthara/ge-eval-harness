#!/usr/bin/env python3
"""
Parallel Connector & streamAssist Test Bed CLI for Yahoo Gemini Enterprise.

Usage:
  # StreamAssist Agentic Reader (Default):
  uv run python3 -m ge_eval_harness.cli.probe_testbed --target "https://drive.google.com/a/thomascummins.altostrat.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO" --query "how do I use python at Yahoo?"
  
  # Multiple targets across connectors in parallel:
  uv run python3 -m ge_eval_harness.cli.probe_testbed --ids "1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO,JIRA-102,gs://yahoo-lumapps-mock-bucket-tc/post-1.html" --engine stream_assist

  # Output full JSON telemetry:
  uv run python3 -m ge_eval_harness.cli.probe_testbed --ids "1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO" --json
"""

import argparse
import asyncio
import json
import os
import sys
import time
from typing import List

# Ensure eval_harness root and parent directory are on sys.path
_HARNESS_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for p in (os.path.abspath(os.path.join(_HARNESS_ROOT, "..")), _HARNESS_ROOT):
    if p not in sys.path:
        sys.path.insert(0, p)

from ge_eval_harness.backend.services.stream_assist_client import execute_stream_assist_testbed
from ge_eval_harness.backend.services.document_connector_service import (
    DocumentConnectorService,
    format_connector_display_name,
)

async def main_async(args: argparse.Namespace):
    # Collect targets
    raw_targets: List[str] = []
    if args.ids:
        raw_targets.extend([i.strip() for i in args.ids.split(",") if i.strip()])
    if args.target:
        raw_targets.extend([t.strip() for t in args.target.split(",") if t.strip()])
    if not raw_targets and not args.query:
        print("❌ Error: Must specify at least one target ID/URL (--target/--ids) or a scenario query (--query).", file=sys.stderr)
        sys.exit(1)

    if args.engine == "stream_assist":
        testbed_result = await execute_stream_assist_testbed(
            targets=raw_targets,
            scenario_query=args.query,
            agent_id=args.agent_id,
            model_id=args.model_id,
            timeout_sec=args.timeout or 35.0,
            search_mode=args.search_mode,
        )

        if args.json:
            print(json.dumps(testbed_result, indent=2))
            return

        print("\n" + "=" * 90)
        print("⚡ YAHOO GEMINI ENTERPRISE — STREAMASSIST PARALLEL DOCUMENT TEST BED")
        print("=" * 90)
        print(f"📌 Engine ID       : {testbed_result['engine_id']}")
        print(f"🤖 Model / Agent   : {args.model_id} / {args.agent_id} ({args.search_mode})")
        print(f"🎯 Targets Dispatched: {testbed_result['targets_count']} link(s) in parallel")
        print(f"⚡ Total Wall Time : {testbed_result['total_latency_ms']} ms")
        print("-" * 90)

        for res in testbed_result.get("results", []):
            idx = res.get("probe_index", 1)
            target = res.get("target", "")
            st = res.get("status_code", 200)
            ttft = res.get("ttft_sec", 0.0)
            ttlt = res.get("ttlt_sec", 0.0)
            tools = res.get("tool_calls", [])
            docs = res.get("retrieved_documents", [])
            resp = res.get("response_text", "")
            verdict = res.get("match_verdict", "")

            icon = "🟢" if st == 200 and docs else ("🟡" if st == 200 else "🔴")
            print(f"{icon} [Target #{idx}]: {target}")
            print(f"   Status: HTTP {st} | TTFT: {ttft}s | TTLT: {ttlt}s | Verdict: {verdict}")
            if tools:
                print(f"   Tools Executed: {[t.get('name') for t in tools if isinstance(t, dict)]}")
            if docs:
                print(f"   Grounded Documents ({len(docs)}):")
                for d in docs[:3]:
                    print(f"     • {d.get('title')} ({d.get('uri') or d.get('document_id')})")
            print(f"   Extracted / Streamed Text:")
            lines = resp.split("\n")
            for l in lines[:4]:
                if l.strip():
                    print(f"     {l}")
            if len(lines) > 4:
                print(f"     ... ({len(resp.split())} words extracted)")
            print("-" * 90)

    else:
        service = DocumentConnectorService(timeout_sec=args.timeout or 3.5)
        testbed_result = await service.execute_parallel_testbed(
            targets=raw_targets,
            scenario_query=args.query,
            connector_ids=args.connector or "all",
        )

        if args.json:
            print(json.dumps(testbed_result, indent=2))
            return

        # Formatted Console Output
        print("\n" + "=" * 85)
        print("🔬 YAHOO GEMINI ENTERPRISE — DATASTORE SEARCH TEST BED")
        print("=" * 85)
        print(f"📌 Scenario Query   : {args.query or 'N/A'}")
        print(f"🎯 Targets Evaluated: {', '.join(testbed_result['targets']) or 'N/A'}")
        print(f"📦 Connected Stores : {testbed_result['total_datastores_count']} active DataStores")
        print(f"⚡ Total Latency    : {testbed_result['total_latency_ms']} ms ({testbed_result['total_probes_dispatched']} probes dispatched)")
        print("-" * 85)

        probe_logs = testbed_result.get("all_probe_logs", [])
        if probe_logs:
            print(f"{'#':<3} | {'Connector':<24} | {'Query Probed':<30} | {'Status':<9} | {'Latency':<8} | {'Results':<7} | {'Verdict'}")
            print("-" * 120)
            for p in probe_logs:
                idx = p.get("probe_index", 0)
                conn = (p.get("connector_name") or "Connector")[:24]
                q_used = (p.get("query_used") or "")[:30]
                st = f"HTTP {p.get('response_status', 0)}"
                lat = f"{p.get('latency_ms', 0)}ms"
                cnt = f"{p.get('results_count', 0)} docs"
                verdict = p.get("match_verdict", "No Match")
                print(f"{idx:<3} | {conn:<24} | {q_used:<30} | {st:<9} | {lat:<8} | {cnt:<7} | {verdict}")
            print("-" * 120)

    print("=" * 90)


def main():
    parser = argparse.ArgumentParser(
        description="Parallel streamAssist & Connector Test Bed CLI for Discovery Engine Assistant.",
    )
    parser.add_argument("--engine", choices=["stream_assist", "search"], default="stream_assist", help="Execution engine (default: stream_assist)")
    parser.add_argument("--ids", help="Comma-separated File IDs / Keys (e.g. 1YYMik21vs4...,JIRA-102)")
    parser.add_argument("--target", help="Single or comma-separated Target Resource URLs/IDs")
    parser.add_argument("--query", help="Scenario Query string (e.g. 'how do I use python at Yahoo?')")
    parser.add_argument("--agent-id", default="core_assistant", help="Agent ID for streamAssist (default: core_assistant)")
    parser.add_argument("--model-id", default="gemini-3.5-flash", help="Model ID (default: gemini-3.5-flash)")
    parser.add_argument("--search-mode", choices=["Agentic", "Vector"], default="Agentic", help="Search Mode (default: Agentic)")
    parser.add_argument("--connector", default="all", help="DataStore ID filter for search mode")
    parser.add_argument("--timeout", type=float, default=35.0, help="Probe timeout in seconds (default: 35.0)")
    parser.add_argument("--json", action="store_true", help="Output raw JSON response")
    
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
