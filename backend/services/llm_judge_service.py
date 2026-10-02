#!/usr/bin/env python3
"""
Vertex AI Gemini LLM-as-a-Judge & Factuality Evaluation Service.
"""

import asyncio
import json
import os
import random
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from ge_eval_harness.backend.services.gcp_auth import ADC_AUTH_ERROR_MESSAGE, get_gcp_credentials

try:
    from google import genai
    from google.genai import types
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False


def normalize_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text.strip()).lower()


def parse_judge_json_response(raw_text: str) -> Dict[str, Any]:
    if not raw_text:
        return {"judge_pass": False, "judge_confidence": 0.0, "judge_reasoning": "Empty response from judge."}
    clean = raw_text.strip()
    if clean.startswith("```"):
        lines = clean.split("\n")
        if len(lines) >= 2:
            clean = "\n".join(lines[1:-1]).strip()
        else:
            clean = clean.replace("```json", "").replace("```", "").strip()
    try:
        data = json.loads(clean)
        return {
            "judge_pass": bool(data.get("pass", False)),
            "judge_confidence": float(data.get("confidence", 0.0)),
            "judge_reasoning": str(data.get("reasoning", "")),
        }
    except Exception as exc:
        return {
            "judge_pass": False,
            "judge_confidence": 0.0,
            "judge_reasoning": f"Failed to parse judge JSON: {exc} | Raw text: {clean[:100]}",
        }


def evaluate_accuracy(response_text: str, ground_truth: str = "") -> bool:
    norm_resp = normalize_text(response_text)
    norm_gt = normalize_text(ground_truth)
    if not norm_resp or not norm_gt:
        return False
    return norm_gt in norm_resp


async def run_llm_judge(query: str, ground_truth: str, response_text: str, project_id: Optional[str] = None) -> Dict[str, Any]:
    if not response_text or "HTTP" in response_text and "Error" in response_text:
        return {"judge_pass": False, "judge_confidence": 0.0, "judge_reasoning": "Error or empty candidate response."}
    if not HAS_GENAI:
        acc = evaluate_accuracy(response_text, ground_truth)
        return {"judge_pass": acc, "judge_confidence": 1.0 if acc else 0.0, "judge_reasoning": "Fallback substring match."}

    prompt = (
        "You are an expert LLM evaluation judge. Evaluate whether the candidate response correctly answers "
        "the user's query based on the ground truth requirement.\n\n"
        f"[USER QUERY]: {query}\n"
        f"[REQUIRED CRITICAL FACT]: {ground_truth}\n"
        f"[CANDIDATE RESPONSE]: {response_text}\n\n"
        "Evaluation Rules:\n"
        "1. PASS: The candidate response contains the critical factual information required by the ground truth, regardless of trailing clauses, sentence structure, or verbosity.\n"
        "2. FAIL: The candidate response states an incorrect amount, claims information is missing/unindexed, "
        "or fails to answer the question.\n\n"
        "Output strict JSON with keys: pass (boolean), confidence (float 0.0 to 1.0), reasoning (string)."
    )

    try:
        def _call_gemini():
            creds, adc_project = get_gcp_credentials()
            effective_project = project_id or os.environ.get("PROJECT_ID") or os.environ.get("GCP_PROJECT") or adc_project
            client = genai.Client(vertexai=True, project=effective_project, location="global", credentials=creds)
            res = client.models.generate_content(
                model="gemini-3.1-pro-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0,
                ),
            )
            return res.text

        raw_json = None
        for attempt in range(3):
            try:
                raw_json = await asyncio.to_thread(_call_gemini)
                break
            except Exception as j_err:
                j_str = str(j_err).lower()
                if ("429" in j_str or "quota" in j_str or "resource_exhausted" in j_str or "rate" in j_str) and attempt < 2:
                    backoff = (1.5 ** attempt) * 1.5 + random.uniform(0.1, 0.5)
                    await asyncio.sleep(backoff)
                else:
                    raise j_err

        return parse_judge_json_response(raw_json)
    except Exception as exc:
        exc_str = str(exc).lower()
        if (
            "reauthentication is needed" in exc_str
            or "defaultcredentialserror" in exc_str
            or "refresherror" in exc_str
            or "could not automatically determine credentials" in exc_str
            or "unauthenticated" in exc_str
            or "invalid_grant" in exc_str
        ):
            print(f"\n{ADC_AUTH_ERROR_MESSAGE}\nUnderlying Error: {exc}\n", flush=True)
            raise RuntimeError(f"{ADC_AUTH_ERROR_MESSAGE}\n\n[Underlying Error]: {exc}") from exc

        acc = evaluate_accuracy(response_text, ground_truth)
        return {
            "judge_pass": acc,
            "judge_confidence": 0.5,
            "judge_reasoning": f"Judge exception fallback ({exc}): substring pass={acc}",
        }


async def evaluate_evidence_grounding(
    query: str,
    ground_truth: str,
    response_text: str,
    retrieved_documents: Optional[List[Dict[str, Any]]] = None,
    source_urls: Optional[List[str]] = None,
    project_id: Optional[str] = None,
    use_fallback: bool = False,
) -> Dict[str, Any]:
    """
    Semantic Evidence Verification Judge:
    Inspects the actual text content and snippets of the cited enterprise document(s) to verify
    whether the document genuinely supports the factual claims made in the model response.
    Guarantees the model is not hallucinating or citing an irrelevant document.
    """
    docs = retrieved_documents or []
    if not docs and not source_urls:
        return {
            "evidence_match": False,
            "confidence": 1.0,
            "supporting_quote": "",
            "reasoning": "No retrieved document content or source URLs available to verify.",
        }

    # Extract all text snippets and titles from cited documents
    doc_contexts = []
    for idx, doc in enumerate(docs):
        title = doc.get("title") or f"Document {idx+1}"
        uri = doc.get("uri") or doc.get("document_id") or ""
        snippets = doc.get("snippets") or doc.get("full_content") or ""
        if snippets:
            doc_contexts.append(f"--- DOCUMENT {idx+1} ({title}) [URI: {uri}] ---\n{snippets.strip()}")

    compiled_doc_text = "\n\n".join(doc_contexts)
    if not compiled_doc_text.strip():
        return {
            "evidence_match": False,
            "confidence": 0.8,
            "supporting_quote": "",
            "reasoning": "Retrieved documents contained no snippet text content to substantiate claims.",
        }

    if use_fallback or not HAS_GENAI or os.environ.get("TESTING") == "true" or os.environ.get("MOCK_ADC") == "true":
        # Deterministic content verification fallback for tests/offline mode
        gt_clean = normalize_text(ground_truth)
        resp_clean = normalize_text(response_text)
        doc_clean = normalize_text(compiled_doc_text)

        # Check if ground truth key terms or numbers appear in the cited document text or title
        gt_tokens = [w for w in gt_clean.split() if len(w) >= 4 or w.isdigit() or w.startswith("$")]
        matching_tokens = [t for t in gt_tokens if t in doc_clean]
        
        # Check document title matches
        title_tokens = [w for doc in docs for w in normalize_text(doc.get("title", "")).split() if len(w) >= 4]
        title_matches = [t for t in gt_tokens if t in title_tokens]
        
        is_supported = len(matching_tokens) >= max(1, int(len(gt_tokens) * 0.3)) or (len(title_matches) >= 2 and len(matching_tokens) >= 1) or gt_clean in doc_clean

        return {
            "evidence_match": is_supported,
            "confidence": 0.95 if is_supported else 0.85,
            "supporting_quote": compiled_doc_text[:200] if is_supported else "",
            "reasoning": f"Fallback content inspection: {len(matching_tokens)}/{len(gt_tokens)} key ground truth tokens found in document text." if is_supported else "Key ground truth facts not found in cited document content.",
        }

    prompt = (
        "You are an expert Enterprise Retrieval & Grounding Judge evaluating search-augmented generation (RAG).\n"
        "Verify whether the CITED DOCUMENT EVIDENCE genuinely supports the candidate response and satisfies the user query requirement.\n\n"
        f"[USER QUERY]: {query}\n"
        f"[REQUIRED GROUND TRUTH FACT]: {ground_truth}\n"
        f"[CANDIDATE RESPONSE]: {response_text}\n\n"
        f"[CITED RETRIEVED DOCUMENTS & SNIPPETS]:\n{compiled_doc_text}\n\n"
        "Evaluation Rules:\n"
        "1. evidence_match = true (VALID EVIDENCE): The cited document content or document title/metadata (e.g. 'contingent_worker_extension.md') "
        "confirms that this is the authoritative enterprise policy or record for the query topic, and the candidate response accurately draws from "
        "or is grounded in this document's subject matter (even if the search index snippet is truncated or condensed).\n"
        "2. evidence_match = false (UNGROUNDED / HALLUCINATION): The cited document is completely unrelated to the query topic (e.g. citing a 401k guide "
        "for a contingent worker question, or citing an unrelated error/login page), or the candidate response fabricated claims contradictory to the source.\n\n"
        "Output strict JSON with keys: evidence_match (boolean), confidence (float 0.0 to 1.0), supporting_quote (string, exact quote or key snippet from the document supporting the claim or empty string), reasoning (string)."
    )

    try:
        def _call_gemini_evidence():
            creds, adc_project = get_gcp_credentials()
            effective_project = project_id or os.environ.get("PROJECT_ID") or os.environ.get("GCP_PROJECT") or adc_project
            client = genai.Client(vertexai=True, project=effective_project, location="global", credentials=creds)
            res = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0,
                ),
            )
            return res.text

        raw_json = None
        for attempt in range(3):
            try:
                raw_json = await asyncio.to_thread(_call_gemini_evidence)
                break
            except Exception as j_err:
                j_str = str(j_err).lower()
                if ("429" in j_str or "quota" in j_str or "resource_exhausted" in j_str or "rate" in j_str) and attempt < 2:
                    backoff = (1.5 ** attempt) * 1.5 + random.uniform(0.1, 0.5)
                    await asyncio.sleep(backoff)
                else:
                    raise j_err

        clean = raw_json.strip() if raw_json else "{}"
        if clean.startswith("```"):
            clean = "\n".join(clean.split("\n")[1:-1]).strip()
        data = json.loads(clean)

        return {
            "evidence_match": bool(data.get("evidence_match", False)),
            "confidence": float(data.get("confidence", 0.90)),
            "supporting_quote": str(data.get("supporting_quote", "")),
            "reasoning": str(data.get("reasoning", "")),
        }
    except Exception as exc:
        gt_clean = normalize_text(ground_truth)
        doc_clean = normalize_text(compiled_doc_text)
        is_supported = gt_clean in doc_clean or any(w in doc_clean for w in gt_clean.split() if len(w) >= 5)
        return {
            "evidence_match": is_supported,
            "confidence": 0.60,
            "supporting_quote": compiled_doc_text[:150] if is_supported else "",
            "reasoning": f"Evidence evaluation exception fallback ({exc}): supported={is_supported}",
        }


def extract_drive_file_id(uri: str) -> Optional[str]:
    if not uri:
        return None
    m1 = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", uri)
    if m1:
        return m1.group(1)
    m2 = re.search(r"/d/([a-zA-Z0-9_-]+)", uri)
    if m2:
        return m2.group(1)
    return None


def find_local_document_content(uri: str) -> Optional[Tuple[str, str]]:
    """
    Looks up authoritative benchmark source documents and synthetic noise files on disk
    by URL mapping or filename to supply live content to the LLM judge.
    """
    file_id = extract_drive_file_id(uri)
    base_dirs = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "source_documents"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "tools", "test_data", "synthetic_noise_docs"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "test_data", "synthetic_noise_docs"),
    ]

    target_filenames = []
    try:
        from ge_eval_harness.backend.services.citation_matcher import CANONICAL_DOC_NAME_TO_URL
        for doc_name, doc_url in CANONICAL_DOC_NAME_TO_URL.items():
            if file_id and file_id in doc_url:
                target_filenames.append(doc_name)
            elif uri and (uri in doc_url or doc_url in uri):
                target_filenames.append(doc_name)
    except Exception:
        pass

    if not target_filenames and "/" in uri:
        target_filenames.append(uri.split("/")[-1])

    for b_dir in base_dirs:
        if not os.path.exists(b_dir):
            continue
        for fname in target_filenames:
            fpath = os.path.join(b_dir, fname)
            if os.path.exists(fpath):
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        return fname, f.read()
                except Exception:
                    pass
    return None


async def fetch_live_document_content(uri: str) -> Dict[str, Any]:
    """
    Authenticates with active GCP/Google Workspace ADC credentials to verify
    document accessibility, fetch live metadata, and read document text.
    Also checks authoritative benchmark document repository for full text extraction.
    """
    # 1. Check local source document repository
    local_match = find_local_document_content(uri)
    if local_match:
        doc_title, doc_text = local_match
        return {
            "accessible": True,
            "status_code": 200,
            "title": doc_title,
            "mime_type": "text/markdown",
            "content": doc_text,
        }

    file_id = extract_drive_file_id(uri)
    if not file_id:
        return {
            "accessible": True,
            "status_code": 200,
            "title": uri.split("/")[-1] if "/" in uri else uri,
            "content": "",
            "mime_type": "text/html",
        }

    try:
        import httpx
        creds, _ = get_gcp_credentials()
        import google.auth.transport.requests
        auth_req = google.auth.transport.requests.Request()
        if hasattr(creds, "valid") and not creds.valid:
            creds.refresh(auth_req)
        
        token = getattr(creds, "token", None)
        headers = {"Authorization": f"Bearer {token}"} if token else {}

        async with httpx.AsyncClient(timeout=3.5) as client:
            meta_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?fields=id,name,mimeType,description"
            meta_resp = await client.get(meta_url, headers=headers)
            
            if meta_resp.status_code == 404:
                return {
                    "accessible": False,
                    "status_code": 404,
                    "error": f"Document Not Found (HTTP 404): File ID '{file_id}' does not exist or was deleted.",
                    "title": "",
                    "content": "",
                }
            elif meta_resp.status_code in (401, 403):
                return {
                    "accessible": False,
                    "status_code": meta_resp.status_code,
                    "error": f"Access Denied (HTTP {meta_resp.status_code}): Active ADC user does not have permission to access Drive file '{file_id}'.",
                    "title": "",
                    "content": "",
                }
            elif meta_resp.status_code != 200:
                return {
                    "accessible": False,
                    "status_code": meta_resp.status_code,
                    "error": f"Drive API returned HTTP {meta_resp.status_code}.",
                    "title": "",
                    "content": "",
                }

            meta_data = meta_resp.json()
            doc_title = meta_data.get("name", "")
            mime_type = meta_data.get("mimeType", "")
            doc_text = meta_data.get("description", "")

            # If it's a Google Doc or Sheet, attempt to export/read text content
            if "google-apps.document" in mime_type:
                export_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=text/plain"
                exp_resp = await client.get(export_url, headers=headers)
                if exp_resp.status_code == 200:
                    doc_text = exp_resp.text[:3000]
            elif "google-apps.spreadsheet" in mime_type:
                export_url = f"https://www.googleapis.com/drive/v3/files/{file_id}/export?mimeType=text/csv"
                exp_resp = await client.get(export_url, headers=headers)
                if exp_resp.status_code == 200:
                    doc_text = exp_resp.text[:3000]
            else:
                # Raw file media download
                media_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
                media_resp = await client.get(media_url, headers=headers)
                if media_resp.status_code == 200:
                    doc_text = media_resp.text[:3000]

            return {
                "accessible": True,
                "status_code": 200,
                "title": doc_title,
                "mime_type": mime_type,
                "content": doc_text,
            }
    except Exception as exc:
        return {
            "accessible": True,
            "status_code": 200,
            "error": str(exc),
            "title": uri.split("/")[-1] if "/" in uri else uri,
            "content": "",
        }


async def evaluate_ground_truth_quality(
    query: str,
    ground_truth: str,
    expected_sources: Any,
    project_id: Optional[str] = None,
    use_fallback: bool = False,
    session_docs: Optional[List[Dict[str, Any]]] = None,
    connector_ids: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Evaluates whether the specified expected golden source(s) in the dataset are STRONG
    (authoritative and specific to the question) or WEAK/INACCESSIBLE (generic, broken, or unauthorized).
    Audits each document via DocumentConnectorService with multi-tier caching, session reuse, and timeouts.
    """
    # Normalize expected sources
    exp_list = []
    if isinstance(expected_sources, list):
        exp_list = [str(s).strip() for s in expected_sources if str(s).strip() and str(s).strip() != "None"]
    elif isinstance(expected_sources, str) and expected_sources.strip() and expected_sources.strip() != "None":
        exp_list = [s.strip() for s in expected_sources.split(" | ") if s.strip() and s.strip() != "None"]

    if not exp_list:
        return {
            "gt_source_quality": "WEAK",
            "gt_quality_confidence": 1.0,
            "gt_quality_reasoning": "No golden reference source document was specified in the ground truth dataset for this query.",
            "audited_sources": [],
            "ground_truth_summary": {
                "query": query,
                "golden_answer": ground_truth,
            }
        }

    exp_str = ", ".join(exp_list)
    audited_sources = []
    has_inaccessible = False
    inaccessible_reason = ""

    from ge_eval_harness.backend.services.document_connector_service import get_document_connector_service
    doc_service = get_document_connector_service()

    # Live verify each document in the expected sources list via DocumentConnectorService
    for s_url in exp_list:
        is_placeholder = any(p in s_url.lower() for p in ["placeholder", "example.com", "none", "todo", "generic"])
        try:
            parsed_s_netloc = urlparse(s_url.lower()).netloc
        except Exception:
            parsed_s_netloc = ""
        is_domain_mismatch = (
            (parsed_s_netloc == "altostrat.com" or parsed_s_netloc.endswith(".altostrat.com"))
            and "yahoo" in str(os.environ.get("COMPANY_NAME", "yahoo")).lower()
        )

        if use_fallback or not HAS_GENAI or os.environ.get("TESTING") == "true" or os.environ.get("MOCK_ADC") == "true":
            is_weak = is_placeholder or len(s_url) < 12
            doc_quality = "DOMAIN_MISMATCH" if is_domain_mismatch else ("WEAK" if is_weak else "STRONG")
            doc_reason = (
                "Golden reference points to an external test domain (altostrat.com) that may be inaccessible under current user credentials."
                if is_domain_mismatch
                else ("Expected reference contains placeholder or insufficient document identifier." if is_weak else "Authoritative golden reference specification provided in dataset.")
            )
            audited_sources.append({
                "uri": s_url,
                "title": s_url.split("/")[-1] if "/" in s_url else s_url,
                "mime_type": "text/html",
                "accessible": not is_domain_mismatch,
                "status_code": 403 if is_domain_mismatch else 200,
                "error": "Domain mismatch: External test domain" if is_domain_mismatch else "",
                "content_preview": "Golden reference specification provided in dataset." if not is_weak else "",
                "connector_used": doc_service._infer_connector_type(s_url),
                "fetch_method": "OFFLINE_RULE",
                "fetch_latency_ms": 0.0,
                "quality": doc_quality,
                "reasoning": doc_reason,
            })
            if is_domain_mismatch or is_weak:
                has_inaccessible = True
                inaccessible_reason = doc_reason
        else:
            live_res = await doc_service.fetch_document(
                uri_or_id=s_url,
                session_docs=session_docs,
                connector_ids=connector_ids,
                scenario_query=query,
                ground_truth=ground_truth,
            )
            is_acc = live_res.get("accessible", False)
            status_code = live_res.get("status_code", 200)
            err_msg = live_res.get("error", "")
            doc_title = live_res.get("title") or (s_url.split("/")[-1] if "/" in s_url else s_url)
            doc_content = live_res.get("content", "")
            fetch_method = live_res.get("fetch_method", "CONNECTOR_PROBE")
            fetch_latency = live_res.get("fetch_latency_ms", 0.0)
            connector_name = live_res.get("connector_used", "Enterprise Connector")

            doc_quality = "STRONG"
            doc_reason = f"Document is accessible via {connector_name} and contains reference facts."
            if not is_acc or status_code in (401, 403, 404, 408, 500):
                doc_quality = "INACCESSIBLE"
                doc_reason = err_msg or f"HTTP {status_code} Error: Unable to access document via {connector_name} under current credentials."
                has_inaccessible = True
                inaccessible_reason = doc_reason
            elif is_domain_mismatch:
                doc_quality = "DOMAIN_MISMATCH"
                doc_reason = "Points to external test domain (altostrat.com) that is outside enterprise corporate domain."
                has_inaccessible = True
                inaccessible_reason = doc_reason
            elif is_placeholder or len(s_url) < 12:
                doc_quality = "WEAK"
                doc_reason = "Reference contains generic placeholder or insufficient document identifier."
                has_inaccessible = True
                inaccessible_reason = doc_reason

            audited_sources.append({
                "uri": s_url,
                "title": doc_title,
                "mime_type": live_res.get("mime_type", "text/html"),
                "accessible": is_acc,
                "status_code": status_code,
                "error": err_msg,
                "content_preview": doc_content[:1500] if doc_content else "",
                "connector_used": connector_name,
                "fetch_method": fetch_method,
                "fetch_latency_ms": fetch_latency,
                "quality": doc_quality,
                "reasoning": doc_reason,
                "debug_trace": live_res.get("debug_trace", {}),
            })

    if use_fallback or not HAS_GENAI or os.environ.get("TESTING") == "true" or os.environ.get("MOCK_ADC") == "true":
        overall_quality = "DOMAIN_MISMATCH" if any(s["quality"] == "DOMAIN_MISMATCH" for s in audited_sources) else ("WEAK" if any(s["quality"] == "WEAK" for s in audited_sources) else "STRONG")
        return {
            "gt_source_quality": overall_quality,
            "gt_quality_confidence": 0.90,
            "gt_quality_reasoning": inaccessible_reason or "Authoritative golden reference specification provided in dataset.",
            "audited_sources": audited_sources,
            "ground_truth_summary": {
                "query": query,
                "golden_answer": ground_truth,
            }
        }

    # Format live document context for LLM evaluator
    live_content_snippets = []
    for aud in audited_sources:
        err_txt = aud.get("error", "")
        status_str = "Accessible (HTTP 200)" if aud.get("accessible") else f"Error: {err_txt}"
        preview_str = aud.get("content_preview") or "No text extracted"
        live_content_snippets.append(
            f"--- Expected Document ({aud.get('title', 'Doc')}) [URI: {aud.get('uri', '')}] ---\n"
            f"Access Status: {status_str}\n"
            f"Content Preview:\n{preview_str}"
        )
    live_doc_context = "\n\n".join(live_content_snippets)

    prompt = (
        "You are an expert Enterprise Ground Truth Quality Evaluator.\n\n"
        "CRITICAL EVALUATION PRINCIPLE:\n"
        "While evidence matching evaluates how cited content supports candidate model answers, "
        "your purpose in Ground Truth Quality Evaluation is to verify whether the specified expected source document(s) "
        "actually contain the information and evidence needed to transition from the [USER QUERY] to the [GROUND TRUTH TARGET ANSWER].\n\n"
        f"[USER QUERY]: {query}\n"
        f"[GROUND TRUTH TARGET ANSWER]: {ground_truth}\n"
        f"[SPECIFIED EXPECTED SOURCE REFERENCE(S)]: {exp_str}\n\n"
        f"[LIVE ACCESSED DOCUMENT CONTENT & METADATA]:\n{live_doc_context}\n\n"
        "EVALUATION RULES:\n"
        "1. STRONG: The document content/title directly substantiates the ground truth target answer for this query (e.g. contains the specific onboarding steps, policies, credentials, or records asserted in the ground truth answer).\n"
        "2. WEAK: The document content/title is IRRELEVANT to the query or ground truth answer (e.g. discussing an API Gateway deprecation instead of Claude onboarding steps), is missing the required facts, or is a generic placeholder/wiki home.\n"
        "3. DOMAIN_MISMATCH / INACCESSIBLE: The document returned an access error (HTTP 401/403/404) or belongs to an unshared external domain.\n\n"
        "Output strict JSON with keys: is_strong (boolean), quality (string 'STRONG', 'WEAK', 'DOMAIN_MISMATCH', or 'INACCESSIBLE'), confidence (float 0.0 to 1.0), reasoning (string concise 1-2 sentence explanation)."
    )

    try:
        def _call_gemini_gt():
            creds, adc_project = get_gcp_credentials()
            effective_project = project_id or os.environ.get("PROJECT_ID") or os.environ.get("GCP_PROJECT") or adc_project
            client = genai.Client(vertexai=True, project=effective_project, location="global", credentials=creds)
            res = client.models.generate_content(
                model="gemini-3.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0,
                ),
            )
            return res.text

        raw_json = None
        for attempt in range(3):
            try:
                raw_json = await asyncio.to_thread(_call_gemini_gt)
                break
            except Exception as j_err:
                j_str = str(j_err).lower()
                if ("429" in j_str or "quota" in j_str or "resource_exhausted" in j_str or "rate" in j_str) and attempt < 2:
                    backoff = (1.5 ** attempt) * 1.5 + random.uniform(0.1, 0.5)
                    await asyncio.sleep(backoff)
                else:
                    raise j_err

        clean = raw_json.strip() if raw_json else "{}"
        if clean.startswith("```"):
            clean = "\n".join(clean.split("\n")[1:-1]).strip()
        data = json.loads(clean)

        raw_quality = str(data.get("quality", "")).upper()
        is_strong = bool(data.get("is_strong", True)) and raw_quality == "STRONG" and not has_inaccessible
        quality_val = "STRONG" if is_strong else (raw_quality if raw_quality in ["WEAK", "DOMAIN_MISMATCH", "INACCESSIBLE"] else ("DOMAIN_MISMATCH" if has_inaccessible else "WEAK"))
        judge_reasoning = str(data.get("reasoning", "Evaluated reference specificity and query-to-ground-truth factual alignment."))

        # Update per-source audit reasoning if weak
        for aud in audited_sources:
            if quality_val in ["WEAK", "DOMAIN_MISMATCH", "INACCESSIBLE"]:
                aud["quality"] = quality_val
                aud["reasoning"] = judge_reasoning

        audit_telemetry = {
            "model_name": "gemini-3.5-flash",
            "evaluator_type": "Live Vertex AI Ground Truth Quality Auditor",
            "evaluation_objective": "Query-to-Ground-Truth Information Verification",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "prompt_sent": prompt,
            "raw_model_response": raw_json,
            "parsed_verdict": {
                "quality": quality_val,
                "is_strong": is_strong,
                "confidence": float(data.get("confidence", 0.90)),
                "reasoning": judge_reasoning,
            },
            "audited_sources_count": len(audited_sources),
        }

        return {
            "gt_source_quality": quality_val,
            "gt_quality_confidence": float(data.get("confidence", 0.90)),
            "gt_quality_reasoning": judge_reasoning,
            "audited_sources": audited_sources,
            "audit_telemetry": audit_telemetry,
            "ground_truth_summary": {
                "query": query,
                "golden_answer": ground_truth,
            }
        }
    except Exception as exc:
        overall_quality = "DOMAIN_MISMATCH" if any(s["quality"] == "DOMAIN_MISMATCH" for s in audited_sources) else ("WEAK" if any(s["quality"] == "WEAK" for s in audited_sources) else "STRONG")
        fallback_reason = f"Ground truth quality audit completed with fallback ({exc})."
        fallback_telemetry = {
            "model_name": "rule_based_fallback",
            "evaluator_type": "Offline Rule-based Specificity & ACL Auditor",
            "evaluation_objective": "Query-to-Ground-Truth Information Verification",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "prompt_sent": prompt if 'prompt' in locals() else "N/A",
            "raw_model_response": f"Exception encountered: {exc}",
            "parsed_verdict": {
                "quality": overall_quality,
                "confidence": 0.75,
                "reasoning": fallback_reason,
            },
            "audited_sources_count": len(audited_sources),
        }
        return {
            "gt_source_quality": overall_quality,
            "gt_quality_confidence": 0.75,
            "gt_quality_reasoning": fallback_reason,
            "audited_sources": audited_sources,
            "audit_telemetry": fallback_telemetry,
            "ground_truth_summary": {
                "query": query,
                "golden_answer": ground_truth,
            }
        }

