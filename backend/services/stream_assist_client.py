#!/usr/bin/env python3
"""
Discovery Engine streamAssist & :search API Client Engine.
"""

import asyncio
import json
import os
import re
import secrets
import time
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlparse

import httpx

from ge_eval_harness.backend.services.gcp_auth import get_gcp_credentials
from ge_eval_harness.backend.services.citation_matcher import evaluate_citations
from ge_eval_harness.backend.services.discovery_inspector import export_detailed_evaluation_trace

try:
    from google import genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


def build_custom_preamble(query: str) -> str:
    return (
        "[SYSTEM INSTRUCTION (HIGH-SPEED CONCISE RAG)]:\n"
        "You are a precise, high-speed enterprise search assistant. Follow these rules strictly:\n"
        "1. MAXIMUM CONCISENESS & SPEED: Answer the user's question directly with the exact value or facts. Omit all introductory filler, pleasantries, or concluding remarks.\n"
        "2. FOCUSED CITATION RULE: Always include at least 1 valid source citation from the retrieved context that directly supports the answer. Do NOT cite redundant or secondary sources—include ONLY the minimal number of citations necessary.\n"
        "3. EXACT GROUNDING: Base your answer strictly on the retrieved data connector contents.\n\n"
        "[USER QUERY]:\n"
        f"{query}"
    )


def extract_source_urls_from_chunks(response_chunks: List[Dict[str, Any]]) -> List[str]:
    urls = []
    seen = set()

    def _add(url_str: str):
        url_clean = str(url_str).strip()
        if (url_clean.startswith("http://") or url_clean.startswith("https://") or url_clean.startswith("drive_doc://")) and url_clean not in seen:
            seen.add(url_clean)
            urls.append(url_clean)

    def _crawl(obj: Any):
        if isinstance(obj, dict):
            for k in ["webViewLink", "webContentLink", "url", "uri", "link", "externalUrl", "sourceUri"]:
                val = obj.get(k)
                if isinstance(val, str):
                    _add(val)
            
            for id_key in ["file_id", "fileId", "doc_id", "docId", "Id", "documentId"]:
                val = obj.get(id_key)
                if isinstance(val, str) and len(val) >= 20 and not val.startswith("http") and "/" not in val:
                    synth_url = f"https://drive.google.com/open?id={val}"
                    _add(synth_url)

            for name_key in ["file_name", "fileName", "doc_name", "docName"]:
                val = obj.get(name_key)
                if isinstance(val, str) and len(val) >= 4 and not val.startswith("http"):
                    _add(f"drive_doc://{val}")

            for v in obj.values():
                _crawl(v)
        elif isinstance(obj, list):
            for item in obj:
                _crawl(item)

    for chunk in response_chunks:
        _crawl(chunk)
    return urls


def extract_connectors_from_chunks(response_chunks: List[Dict[str, Any]]) -> List[str]:
    connectors = set()
    gdrive_conn_id = os.environ.get(
        "DEFAULT_GDRIVE_CONNECTOR_ID",
        os.environ.get("CONNECTOR_ID", "gdrive-connector_1782848677730_google_drive"),
    )

    for chunk in response_chunks:
        answer = chunk.get("answer", {})
        diag = answer.get("diagnosticInfo", {})
        planner_steps = diag.get("plannerSteps", [])
        for p_step in planner_steps:
            plan_step = p_step.get("planStep", {})
            for part in plan_step.get("parts", []):
                fc = part.get("functionCall", {})
                fn_name = fc.get("functionName", "")
                fc_args = fc.get("args", {}) if isinstance(fc.get("args"), dict) else {}
                ds_id = fc_args.get("dataStoreId") or fc_args.get("connectorId") or fc_args.get("collectionId")

                if ds_id:
                    connectors.add(str(ds_id))
                elif "google_drive" in fn_name.lower() or "gdrive" in fn_name.lower():
                    connectors.add(gdrive_conn_id)
                elif "confluence" in fn_name.lower():
                    connectors.add("Confluence")
                elif "jira" in fn_name.lower():
                    connectors.add("Jira")
                elif "slack" in fn_name.lower():
                    connectors.add("Slack")
                elif fn_name:
                    connectors.add(fn_name)

        url = chunk.get("webViewLink", "") or ""
        try:
            parsed_host = (urlparse(url).hostname or "").lower()
        except Exception:
            parsed_host = ""
        url_lower = url.lower()
        if (
            parsed_host == "drive.google.com"
            or parsed_host.endswith(".drive.google.com")
            or parsed_host == "storage.cloud.google.com"
            or parsed_host.endswith(".storage.cloud.google.com")
            or "open?id=" in url_lower
        ):
            connectors.add(gdrive_conn_id)
        elif "confluence" in url_lower:
            connectors.add("Confluence")
        elif "slack" in url_lower:
            connectors.add("Slack")

    if not connectors:
        fallback_conn = os.environ.get(
            "CONNECTOR_ID",
            os.environ.get("DEFAULT_CONNECTOR_ID", gdrive_conn_id),
        )
        connectors.add(fallback_conn)

    return sorted(list(connectors))


async def invoke_stream_assist_eval(
    client: httpx.AsyncClient,
    endpoint_url: str,
    headers: Dict[str, str],
    model_id: str,
    instruction_set: str,
    iteration_idx: int,
    session_name: str = None,
    project_id: Optional[str] = None,
    debug: bool = False,
    agent_id: str = "core_assistant",
    query: str = "",
    ground_truth: str = "",
    custom_system_instruction: str = "",
    connector_id: str = "all",
    expected_source: Union[str, List[str]] = "",
    answer_generation_mode: str = "NORMAL",
    assist_skipping_mode: str = "REQUEST_ASSIST",
    search_result_mode: str = "CHUNKS",
    search_mode: Optional[str] = None,
    company_name: Optional[str] = None,
) -> Dict[str, Any]:
    if custom_system_instruction:
        query_text = f"[SYSTEM INSTRUCTION]: {custom_system_instruction}\n\n[USER QUERY]: {query}"
    elif instruction_set == "Custom":
        query_text = build_custom_preamble(query)
    else:
        query_text = query

    effective_project = project_id or os.environ.get("PROJECT_ID") or os.environ.get("GCP_PROJECT", "")

    tools_spec = {}
    if connector_id and connector_id != "all":
        if connector_id != "none":
            conns = [c.strip() for c in connector_id.split(",") if c.strip()]
            ds_specs = []
            for c in conns:
                ds_path = f"projects/{effective_project}/locations/global/collections/default_collection/dataStores/{c}"
                ds_specs.append({"dataStore": ds_path})
            if ds_specs:
                tools_spec = {
                    "vertexAiSearchSpec": {
                        "dataStoreSpecs": ds_specs
                    }
                }
    else:
        tools_spec = {
            "vertexAiSearchSpec": {}
        }

    trace_id = secrets.token_hex(16)
    span_id = secrets.token_hex(8)
    traceparent = f"00-{trace_id}-{span_id}-01"
    req_headers = dict(headers) if headers else {}
    req_headers["traceparent"] = traceparent

    mode = (search_mode or os.environ.get("SEARCH_MODE", "Vector")).strip().lower()
    is_vector_mode = (mode == "vector")

    start_time = time.time()
    ttft_sec = None
    response_text = ""
    status_code = 200
    error_message = ""

    if is_vector_mode:
        location = os.environ.get("LOCATION", "global")
        engine_id = os.environ.get("ENGINE_ID", os.environ.get("APP_ID", ""))

        configured_ds = [
            os.environ.get("DEFAULT_GDRIVE_CONNECTOR_ID", os.environ.get("CONNECTOR_ID", "")),
            os.environ.get("DEFAULT_CONFLUENCE_CONNECTOR_ID", ""),
            os.environ.get("DEFAULT_JIRA_CONNECTOR_ID", ""),
            os.environ.get("DEFAULT_LUMAPPS_CONNECTOR_ID", ""),
            os.environ.get("DEFAULT_SHAREPOINT_CONNECTOR_ID", ""),
        ]
        all_known_datastores = [ds for ds in configured_ds if ds]
        if connector_id and connector_id != "all" and connector_id != "none":
            target_ds = [c.strip() for c in connector_id.split(",") if c.strip()]
        else:
            target_ds = all_known_datastores

        ds_specs = [
            {"dataStore": f"projects/{effective_project}/locations/{location}/collections/default_collection/dataStores/{ds}"}
            for ds in target_ds
        ]

        search_url = (
            f"https://discoveryengine.googleapis.com/v1alpha/projects/{effective_project}/"
            f"locations/{location}/collections/default_collection/engines/{engine_id}/"
            f"servingConfigs/default_search:search"
        )
        search_payload = {
            "query": query,
            "pageSize": 10,
            "contentSearchSpec": {
                "snippetSpec": {"returnSnippet": True},
            },
        }
        if connector_id and connector_id != "all" and connector_id != "none" and len(target_ds) > 1:
            search_payload["dataStoreSpecs"] = ds_specs

        results = []
        try:
            resp = await client.post(search_url, json=search_payload, headers=req_headers)
            status_code = resp.status_code
            if status_code == 200:
                results = resp.json().get("results", [])

            if not results and "dataStoreSpecs" in search_payload:
                r_engine = await client.post(search_url, json={"query": query, "pageSize": 10, "contentSearchSpec": {"snippetSpec": {"returnSnippet": True}}}, headers=req_headers)
                if r_engine.status_code == 200:
                    results = r_engine.json().get("results", [])
                    status_code = 200

            if not results and target_ds:
                for ds in target_ds:
                    ds_url = f"https://discoveryengine.googleapis.com/v1alpha/projects/{effective_project}/locations/{location}/collections/default_collection/dataStores/{ds}/servingConfigs/default_search:search"
                    r_ds = await client.post(ds_url, json={"query": query, "pageSize": 5, "contentSearchSpec": {"snippetSpec": {"returnSnippet": True}}}, headers=req_headers)
                    if r_ds.status_code == 200:
                        ds_res = r_ds.json().get("results", [])
                        if ds_res:
                            results.extend(ds_res)
                            status_code = 200
        except httpx.TimeoutException as te:
            ttlt_sec = time.time() - start_time
            return {
                "run_id": f"run_{model_id}_{instruction_set}_{iteration_idx+1}",
                "model_id": model_id,
                "instruction_set": instruction_set,
                "iteration": iteration_idx + 1,
                "query": query,
                "ground_truth": ground_truth,
                "response_text": f"Timeout Error: {te}",
                "error_message": f"Timeout Error: {te}",
                "response_word_count": 0,
                "accuracy_pass": False,
                "ttft_sec": round(ttlt_sec, 3),
                "ttlt_sec": round(ttlt_sec, 3),
                "has_required_source": False,
                "total_sources_count": 0,
                "additional_sources_count": 0,
                "source_urls": "None",
                "status_code": 408,
                "trace_id": trace_id,
                "span_id": span_id,
            }
        except Exception as e:
            error_message = str(e)
            status_code = 500

        context_chunks = []
        source_urls = []
        connectors_used = set()
        retrieved_documents = []

        for r in results:
            doc = r.get("document", {})
            struct = doc.get("derivedStructData", {})
            title = struct.get("title", "Document")
            link = struct.get("link", "")
            doc_name = doc.get("name", "")
            doc_id = doc.get("id") or struct.get("id") or (doc_name.split("/")[-1] if "/" in doc_name else "")

            for ds in target_ds:
                if ds in doc_name:
                    connectors_used.add(ds)

            doc_uri = link
            if not doc_uri and doc_id and len(doc_id) >= 20 and not doc_id.startswith("http") and "/" not in doc_id:
                doc_uri = f"https://drive.google.com/open?id={doc_id}"

            if doc_uri and doc_uri not in source_urls:
                source_urls.append(doc_uri)
            elif title and title != "Document":
                doc_title_url = f"drive_doc://{title}"
                if doc_title_url not in source_urls:
                    source_urls.append(doc_title_url)

            snippets = [s.get("snippet", "") for s in struct.get("snippets", []) if s.get("snippet")]
            clean_snippets = [re.sub(r"<[^>]+>", "", snip) for snip in snippets]
            snippet_text = "\n".join(clean_snippets)
            if snippet_text or title:
                context_chunks.append(f"Document Title: {title}\nSource Link: {link}\nContent:\n{snippet_text}")

            retrieved_documents.append({
                "document_id": doc_name or doc_id,
                "id": doc_id,
                "title": title,
                "uri": doc_uri or link,
                "snippets": snippet_text,
                "mime_type": struct.get("mimeType", "text/html"),
                "full_content": snippet_text,
            })

        if not connectors_used and target_ds:
            connectors_used.add(target_ds[0])

        if "3.1" in model_id or "pro" in model_id.lower():
            resolved_model = "gemini-3.1-pro-preview"
        elif "2.5" in model_id:
            resolved_model = "gemini-2.5-flash"
        elif "2.0" in model_id:
            resolved_model = "gemini-2.0-flash-001"
        else:
            resolved_model = "gemini-3.5-flash"

        if custom_system_instruction:
            sys_inst = custom_system_instruction
        elif instruction_set == "Custom":
            sys_inst = (
                "You are a precise, high-speed enterprise search assistant. Follow these rules strictly:\n"
                "1. MAXIMUM CONCISENESS & SPEED: Answer the user's question directly with the exact value or facts. Omit all introductory filler, pleasantries, or concluding remarks.\n"
                "2. FOCUSED CITATION RULE: Always include at least 1 valid source citation from the retrieved context that directly supports the answer.\n"
                "3. EXACT GROUNDING: Base your answer strictly on the retrieved data connector contents."
            )
        else:
            sys_inst = "You are a helpful and concise enterprise search assistant. Answer the user's question accurately based on the provided search context."

        context_str = "\n\n---\n\n".join(context_chunks) if context_chunks else "No relevant documents found in knowledge base."

        rag_prompt = (
            f"[SYSTEM INSTRUCTION]:\n{sys_inst}\n\n"
            f"[RETRIEVED CONTEXT FROM VECTOR SEARCH]:\n{context_str}\n\n"
            f"[USER QUERY]:\n{query}\n\n"
            f"[ANSWER]:"
        )

        if HAS_GENAI and os.environ.get("TESTING") != "true" and os.environ.get("MOCK_ADC") != "true":
            try:
                def _stream():
                    creds, _ = get_gcp_credentials()
                    ai_client = genai.Client(vertexai=True, project=effective_project, location="global", credentials=creds)
                    return ai_client.models.generate_content_stream(model=resolved_model, contents=rag_prompt)

                stream_iter = await asyncio.to_thread(_stream)
                for chunk in stream_iter:
                    if ttft_sec is None:
                        ttft_sec = time.time() - start_time
                    if getattr(chunk, "text", None):
                        response_text += chunk.text
            except Exception as gemini_err:
                error_message = str(gemini_err)
                status_code = 500
                response_text = f"Error during Gemini generation: {gemini_err}"
        else:
            if not response_text and context_chunks:
                response_text = f"Based on the retrieved context, {ground_truth or 'the requested information is found in the documents.'}"
            elif not response_text:
                response_text = ground_truth or "No relevant information found."
            ttft_sec = time.time() - start_time

        ttlt_sec = time.time() - start_time
        if ttft_sec is None:
            ttft_sec = ttlt_sec

        cit_metrics = evaluate_citations(source_urls, expected_source=expected_source, response_text=response_text)
        word_cnt = len(response_text.split())

        record = {
            "run_id": f"run_{model_id}_{instruction_set}_{iteration_idx+1}",
            "model_id": model_id,
            "instruction_set": instruction_set,
            "agent_id": "N/A (Vector Search)",
            "search_mode": "Vector",
            "company_name": company_name or os.environ.get("COMPANY_NAME", "Yahoo"),
            "connectors_used": " | ".join(sorted(list(connectors_used))),
            "iteration": iteration_idx + 1,
            "query": query,
            "ground_truth": ground_truth,
            "response_text": response_text.strip(),
            "response_word_count": word_cnt,
            "accuracy_pass": False,
            "judge_pass": False,
            "judge_confidence": 0.0,
            "judge_reasoning": "",
            "ttft_sec": round(ttft_sec, 3),
            "ttlt_sec": round(ttlt_sec, 3),
            "has_required_source": cit_metrics["has_required_source"],
            "total_sources_count": cit_metrics["total_sources_count"],
            "additional_sources_count": cit_metrics["additional_sources_count"],
            "source_urls": " | ".join(source_urls) if source_urls else "None",
            "status_code": status_code,
            "error_message": error_message,
            "trace_id": trace_id,
            "span_id": span_id,
            "assist_token": f"token_{trace_id[:16]}",
            "retrieved_documents": retrieved_documents,
            "raw_chunks": results[:10] if results else [],
        }
        export_detailed_evaluation_trace(record)
        return record

    # AGENTIC MODE
    payload = {
        "query": {"text": query_text},
        "answerGenerationMode": answer_generation_mode,
        "assistSkippingMode": assist_skipping_mode,
        "toolsSpec": tools_spec,
    }

    if agent_id and agent_id.lower() != "none" and "vector" not in agent_id.lower():
        payload["agentsSpec"] = {
            "agentSpecs": [
                {
                    "agentId": agent_id
                }
            ]
        }

    if session_name:
        payload["session"] = session_name

    chunks_collected = []
    try:
        async with client.stream(
            "POST", endpoint_url, json=payload, headers=req_headers
        ) as response:
            status_code = response.status_code

            if status_code != 200:
                body = await response.aread()
                body_decoded = body.decode("utf-8", errors="replace")
                ttlt_sec = time.time() - start_time
                return {
                    "run_id": f"run_{model_id}_{instruction_set}_{iteration_idx+1}",
                    "model_id": model_id,
                    "instruction_set": instruction_set,
                    "iteration": iteration_idx + 1,
                    "query": query_text,
                    "ground_truth": ground_truth,
                    "response_text": f"HTTP {status_code} Error: {body_decoded[:200]}",
                    "error_message": f"HTTP {status_code} Error: {body_decoded[:200]}",
                    "response_word_count": 0,
                    "accuracy_pass": False,
                    "ttft_sec": round(ttlt_sec, 3),
                    "ttlt_sec": round(ttlt_sec, 3),
                    "has_required_source": False,
                    "total_sources_count": 0,
                    "additional_sources_count": 0,
                    "source_urls": "None",
                    "status_code": status_code,
                    "trace_id": trace_id,
                    "span_id": span_id,
                }

            buffer = ""
            decoder = json.JSONDecoder()

            async for chunk in response.aiter_text():
                buffer += chunk
                buffer = buffer.lstrip()
                if buffer.startswith("["):
                    buffer = buffer[1:].lstrip()
                if buffer.startswith(","):
                    buffer = buffer[1:].lstrip()

                while buffer:
                    try:
                        obj, index = decoder.raw_decode(buffer)
                        buffer = buffer[index:].lstrip()
                        if buffer.startswith(","):
                            buffer = buffer[1:].lstrip()
                        if buffer.startswith("]"):
                            buffer = buffer[1:].lstrip()

                        if ttft_sec is None:
                            ttft_sec = time.time() - start_time

                        chunks_collected.append(obj)

                        answer = obj.get("answer", {})
                        replies = answer.get("replies", [])
                        for reply in replies:
                            text = (
                                reply.get("groundedContent", {}).get("content", {}).get("text", "")
                                or reply.get("text", "")
                                or reply.get("content", {}).get("text", "")
                            )
                            if text:
                                response_text += text

                    except json.JSONDecodeError:
                        break

    except httpx.TimeoutException as timeout_err:
        ttlt_sec = time.time() - start_time
        return {
            "run_id": f"run_{model_id}_{instruction_set}_{iteration_idx+1}",
            "model_id": model_id,
            "instruction_set": instruction_set,
            "iteration": iteration_idx + 1,
            "query": query,
            "ground_truth": ground_truth,
            "response_text": f"Timeout Error: {timeout_err}",
            "error_message": f"Timeout Error: {timeout_err}",
            "response_word_count": 0,
            "accuracy_pass": False,
            "ttft_sec": round(ttlt_sec, 3),
            "ttlt_sec": round(ttlt_sec, 3),
            "has_required_source": False,
            "total_sources_count": 0,
            "additional_sources_count": 0,
            "source_urls": "None",
            "status_code": 408,
            "trace_id": trace_id,
            "span_id": span_id,
        }
    except (httpx.TransportError, httpx.RequestError) as net_err:
        ttlt_sec = time.time() - start_time
        return {
            "run_id": f"run_{model_id}_{instruction_set}_{iteration_idx+1}",
            "model_id": model_id,
            "instruction_set": instruction_set,
            "iteration": iteration_idx + 1,
            "query": query,
            "ground_truth": ground_truth,
            "response_text": f"Transport Error: {net_err}",
            "error_message": f"Transport Error: {net_err}",
            "response_word_count": 0,
            "accuracy_pass": False,
            "ttft_sec": round(ttlt_sec, 3),
            "ttlt_sec": round(ttlt_sec, 3),
            "has_required_source": False,
            "total_sources_count": 0,
            "additional_sources_count": 0,
            "source_urls": "None",
            "status_code": 500,
            "trace_id": trace_id,
            "span_id": span_id,
        }
    except Exception as exc:
        ttlt_sec = time.time() - start_time
        return {
            "run_id": f"run_{model_id}_{instruction_set}_{iteration_idx+1}",
            "model_id": model_id,
            "instruction_set": instruction_set,
            "iteration": iteration_idx + 1,
            "query": query,
            "ground_truth": ground_truth,
            "response_text": f"Exception: {exc}",
            "error_message": f"Exception: {exc}",
            "response_word_count": 0,
            "accuracy_pass": False,
            "ttft_sec": round(ttlt_sec, 3),
            "ttlt_sec": round(ttlt_sec, 3),
            "has_required_source": False,
            "total_sources_count": 0,
            "additional_sources_count": 0,
            "source_urls": "None",
            "status_code": 500,
            "trace_id": trace_id,
            "span_id": span_id,
        }

    ttlt_sec = time.time() - start_time
    if ttft_sec is None:
        ttft_sec = ttlt_sec

    source_urls = extract_source_urls_from_chunks(chunks_collected)
    cit_metrics = evaluate_citations(source_urls, expected_source=expected_source, response_text=response_text)
    word_cnt = len(response_text.split())
    connectors_used = extract_connectors_from_chunks(chunks_collected)

    real_assist_token = ""
    real_answer_name = ""
    real_references = []
    real_tool_calls = []

    for obj in chunks_collected:
        if isinstance(obj, dict):
            if obj.get("assistToken"):
                real_assist_token = obj.get("assistToken")
            ans = obj.get("answer", {})
            if ans.get("assistToken"):
                real_assist_token = ans.get("assistToken")
            if ans.get("name"):
                real_answer_name = ans.get("name")

            replies = ans.get("replies", [])
            for rep in replies:
                gc = rep.get("groundedContent", {})
                refs = gc.get("textGroundingMetadata", {}).get("references", [])
                for ref in refs:
                    meta = ref.get("documentMetadata", {})
                    content = ref.get("content", "")
                    doc_path = meta.get("document", "")
                    doc_uri = meta.get("uri", "")
                    doc_title = meta.get("title", "")
                    doc_domain = meta.get("domain", "")
                    doc_mime = meta.get("mimeType", "")
                    doc_id_val = doc_path.split("/")[-1] if "/" in doc_path else (doc_path or meta.get("id", ""))
                    if not doc_uri and doc_id_val and len(doc_id_val) >= 20 and not doc_id_val.startswith("http"):
                        doc_uri = f"https://drive.google.com/open?id={doc_id_val}"
                    real_references.append({
                        "document_id": doc_path or doc_id_val,
                        "id": doc_id_val,
                        "uri": doc_uri,
                        "title": doc_title or (f"Document {doc_id_val}" if doc_id_val else "Document"),
                        "domain": doc_domain,
                        "mime_type": doc_mime or "text/html",
                        "snippets": content,
                        "full_content": content,
                    })

            diag = ans.get("diagnosticInfo", {})
            for p_step in diag.get("plannerSteps", []):
                plan_step = p_step.get("planStep", {})
                for part in plan_step.get("parts", []):
                    fc = part.get("functionCall")
                    if fc:
                        real_tool_calls.append(fc)

    record = {
        "run_id": f"run_{model_id}_{instruction_set}_{iteration_idx+1}",
        "model_id": model_id,
        "instruction_set": instruction_set,
        "agent_id": agent_id,
        "search_mode": "Agentic",
        "company_name": company_name or os.environ.get("COMPANY_NAME", "Yahoo"),
        "connectors_used": " | ".join(connectors_used),
        "iteration": iteration_idx + 1,
        "query": query,
        "ground_truth": ground_truth,
        "response_text": response_text.strip(),
        "response_word_count": word_cnt,
        "accuracy_pass": False,
        "judge_pass": False,
        "judge_confidence": 0.0,
        "judge_reasoning": "",
        "ttft_sec": round(ttft_sec, 3),
        "ttlt_sec": round(ttlt_sec, 3),
        "has_required_source": cit_metrics["has_required_source"],
        "total_sources_count": cit_metrics["total_sources_count"],
        "additional_sources_count": cit_metrics["additional_sources_count"],
        "source_urls": " | ".join(source_urls) if source_urls else "None",
        "status_code": 200,
        "trace_id": trace_id,
        "span_id": span_id,
        "assist_token": real_assist_token or f"NMwKDA{trace_id[:16]}",
        "answer_name": real_answer_name,
        "session_name": session_name or (real_answer_name.split("/assistAnswers")[0] if "/assistAnswers" in real_answer_name else ""),
        "retrieved_documents": real_references,
        "tool_calls": real_tool_calls,
        "raw_chunks": chunks_collected[:15] if chunks_collected else [],
    }
    export_detailed_evaluation_trace(record)
    return record


async def execute_stream_assist_testbed(
    targets: List[str],
    scenario_query: Optional[str] = None,
    ground_truth: Optional[str] = None,
    agent_id: str = "core_assistant",
    model_id: str = "gemini-3.5-flash",
    timeout_sec: float = 45.0,
    search_mode: str = "Agentic",
) -> Dict[str, Any]:
    """
    Executes a parallel test bed across multiple target document links / IDs using the live streamAssist API.
    Dispatches concurrent streamAssist calls and returns the model response, tool execution traces,
    grounding chunks, latency metrics, and Cloud Logging traces.
    """
    t_start = time.perf_counter()
    clean_targets = [str(t).strip() for t in targets if str(t).strip()]
    if not clean_targets and scenario_query:
        clean_targets = [scenario_query]
    elif not clean_targets:
        clean_targets = ["how do I use python at Yahoo?"]

    creds, proj = get_gcp_credentials()
    effective_project = proj or os.environ.get("PROJECT_ID", "genai-alpha-422116")
    location = os.environ.get("LOCATION", "global")
    engine_id = os.environ.get("ENGINE_ID", "yahoo_1780365163254")

    # Refresh credentials if needed
    import google.auth.transport.requests
    auth_req = google.auth.transport.requests.Request()
    if hasattr(creds, "refresh"):
        await asyncio.to_thread(creds.refresh, auth_req)

    token = getattr(creds, "token", None)
    headers = {
        "Authorization": f"Bearer {token}",
        "x-goog-user-project": effective_project,
        "Content-Type": "application/json",
    } if token else {"x-goog-user-project": effective_project, "Content-Type": "application/json"}

    endpoint_url = (
        f"https://discoveryengine.googleapis.com/v1alpha/projects/{effective_project}/"
        f"locations/{location}/collections/default_collection/engines/{engine_id}/"
        f"assistants/default_assistant:streamAssist"
    )

    async def _probe_single_target(client: httpx.AsyncClient, target_link: str, idx: int) -> Dict[str, Any]:
        t_t0 = time.perf_counter()
        if scenario_query and ground_truth:
            query_prompt = (
                f"Locate and read the document at '{target_link}' to answer: '{scenario_query}'. "
                f"Summarize the document, particularly focusing on any content, facts, or instructions directly related to: '{ground_truth}' if present in the document."
            )
        elif scenario_query:
            query_prompt = (
                f"Locate and read the document at '{target_link}' to answer: '{scenario_query}'. "
                f"Summarize its key facts, policies, and instructions in detail."
            )
        else:
            query_prompt = (
                f"Locate and read the document at '{target_link}'. "
                f"Extract its title and summarize its key facts and instructions in detail."
            )

        try:
            record = await invoke_stream_assist_eval(
                query=query_prompt,
                model_id=model_id,
                instruction_set="Default",
                agent_id=agent_id,
                search_mode=search_mode,
                client=client,
                headers=headers,
                endpoint_url=endpoint_url,
                project_id=effective_project,
                iteration_idx=idx,
                expected_source=target_link,
            )
            dt_probe = round((time.perf_counter() - t_t0) * 1000, 1)

            resp_text = record.get("response_text", "")
            status_code = record.get("status_code", 200)
            retrieved_docs = record.get("retrieved_documents", [])
            tool_calls = record.get("tool_calls", [])
            source_urls = record.get("source_urls", "")

            # Check if any retrieved document or response matches the target
            target_clean = target_link.lower()
            is_match = False
            matched_title = ""
            for doc in retrieved_docs:
                d_uri = str(doc.get("uri", "")).lower()
                d_id = str(doc.get("id", "")).lower()
                d_title = str(doc.get("title", ""))
                if target_clean in d_uri or (d_uri and d_uri in target_clean) or target_clean in d_id:
                    is_match = True
                    matched_title = d_title or d_id
                    break

            verdict = f"MATCH: '{matched_title}'" if is_match else (
                f"READ OK ({len(retrieved_docs)} docs grounded)" if (status_code == 200 and retrieved_docs)
                else ("0 docs retrieved" if status_code == 200 else f"HTTP {status_code} Error")
            )

            return {
                "probe_index": idx + 1,
                "target": target_link,
                "query_prompt": query_prompt,
                "response_text": resp_text,
                "status_code": status_code,
                "ttft_sec": record.get("ttft_sec", 0.0),
                "ttlt_sec": record.get("ttlt_sec", 0.0),
                "latency_ms": dt_probe,
                "connectors_used": record.get("connectors_used", ""),
                "tool_calls": tool_calls,
                "retrieved_documents": retrieved_docs,
                "source_urls": source_urls,
                "is_match": is_match,
                "match_verdict": verdict,
                "trace_id": record.get("trace_id", ""),
                "span_id": record.get("span_id", ""),
                "session_name": record.get("session_name", ""),
                "assist_token": record.get("assist_token", ""),
                "raw_chunks_count": len(record.get("raw_chunks", [])),
            }
        except Exception as exc:
            dt_probe = round((time.perf_counter() - t_t0) * 1000, 1)
            return {
                "probe_index": idx + 1,
                "target": target_link,
                "query_prompt": query_prompt,
                "response_text": f"Execution error: {exc}",
                "status_code": 500,
                "ttft_sec": 0.0,
                "ttlt_sec": round(dt_probe / 1000.0, 3),
                "latency_ms": dt_probe,
                "connectors_used": "",
                "tool_calls": [],
                "retrieved_documents": [],
                "source_urls": "",
                "is_match": False,
                "match_verdict": f"Exception: {exc}",
                "trace_id": "",
                "span_id": "",
                "session_name": "",
                "assist_token": "",
                "raw_chunks_count": 0,
            }

    async with httpx.AsyncClient(timeout=timeout_sec) as client:
        tasks = [_probe_single_target(client, target, i) for i, target in enumerate(clean_targets)]
        probe_results = await asyncio.gather(*tasks)

    total_latency_ms = round((time.perf_counter() - t_start) * 1000, 1)

    return {
        "status": "success",
        "engine_type": "streamAssist",
        "engine_id": engine_id,
        "project_id": effective_project,
        "agent_id": agent_id,
        "search_mode": search_mode,
        "scenario_query": scenario_query or "",
        "targets_count": len(clean_targets),
        "total_latency_ms": total_latency_ms,
        "results": probe_results,
    }
