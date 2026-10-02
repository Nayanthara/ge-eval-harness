#!/usr/bin/env python3
"""
Backend Services Package for Yahoo Gemini Enterprise Evaluation Harness.
Re-exports all modular domain services for clean, decoupled access.
"""

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
from ge_eval_harness.backend.services.trace_diagnostician import (
    compile_full_scenario_logs,
    diagnose_scenario_failure,
)
from ge_eval_harness.backend.services.browser_ui_service import (
    BrowserUIService,
    record_ui_session,
)
from ge_eval_harness.backend.services.glean_eval_service import (
    GleanEvaluationService,
    MASTER_COMPARISON_FIELDNAMES,
    evaluate_glean_baseline_batch,
    merge_master_comparison_csv,
    _parse_url_list,
)
from ge_eval_harness.backend.services.latency_engine import (
    calculate_latency_stats,
    run_concurrent_api_benchmarks,
    execute_stream_assist_call,
)
from ge_eval_harness.backend.services.discovery_inspector import (
    DiscoveryInspector,
    export_detailed_evaluation_trace,
    export_trace_to_gcp_cloud_trace,
    generate_w3c_traceparent,
    inspect_discovery_engine_collections,
    inspect_collections,
)
from ge_eval_harness.backend.services.bigquery_analytics import (
    BigQueryEvaluationExporter,
    BigQueryAnalyticsPipeline,
    export_records_to_bigquery,
    export_dataset_to_bigquery,
    generate_dataform_ddl,
)
from ge_eval_harness.backend.services.unified_eval_service import (
    execute_unified_evaluation,
    get_run_events,
    log_run_event,
    cleanup_stale_cached_runs,
)
from ge_eval_harness.backend.services.document_connector_service import (
    DocumentConnectorService,
    get_document_connector_service,
)

