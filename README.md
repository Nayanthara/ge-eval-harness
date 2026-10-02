# Gemini Enterprise Evaluation & Benchmarking Harness

A standardized benchmarking, diagnostic, and quality evaluation platform comparing **Gemini Enterprise** against baseline search engines (e.g. Glean) across 26 metrics—including latency percentiles (TTFT, TTFA, TTLT), 3-tier accuracy grading (LLM Judge, Evidence Match, Source Match), automated AI Root-Cause Failure Diagnosis, and live multi-connector data store verification.

---

## 📑 Detailed Documentation & User Manual
* 📄 **Print-Ready PDF User Manual:** [`docs/EVAL_STUDIO_USER_MANUAL.pdf`](../../docs/EVAL_STUDIO_USER_MANUAL.pdf) *(Comprehensive 13-section guide)*
* 📝 **Markdown User Manual:** [`docs/EVAL_STUDIO_USER_MANUAL.md`](../../docs/EVAL_STUDIO_USER_MANUAL.md)

---

## 🗺️ 1. Architecture & Directory Organization

The evaluation harness is decoupled into a modular Python FastAPI backend and a modern Lit / Material Design 3 frontend:

```text
ge_eval_harness/
├── backend/                                # FastAPI Backend & Evaluation Services
│   ├── app.py                             # FastAPI server (port 8088/8095) with REST routes & SSE streaming
│   ├── config.py                          # Cartesian matrix configuration engine & scenario models
│   ├── eval_judge_service.py              # Backwards-compatible facade re-exporting all service submodules
│   ├── services/                          # Modular Service Architecture
│   │   ├── bigquery_analytics.py          # BigQuery 3-way analytics & dataset export service
│   │   ├── browser_ui_service.py          # Playwright headless browser session recorder
│   │   ├── citation_matcher.py            # 6-tier citation attribution matching engine
│   │   ├── discovery_inspector.py         # Live GCP Discovery Engine connector auto-discovery
│   │   ├── document_connector_service.py  # 5-tier cascading connector & agentic document reader
│   │   ├── gcp_auth.py                    # GCP Application Default Credentials (ADC) token manager
│   │   ├── glean_eval_service.py          # Glean CSV ingestion & multi-source schema parsers
│   │   ├── latency_engine.py              # High-concurrency streamAssist REST API load tester
│   │   ├── llm_judge_service.py           # Vertex AI Gemini LLM-as-a-Judge & ground truth quality auditor
│   │   ├── stream_assist_client.py        # High-performance HTTP/2 SSE streaming client
│   │   ├── trace_diagnostician.py         # AI Root-Cause Failure Diagnostician & triage engine
│   │   └── unified_eval_service.py        # Master evaluation pipeline, telemetry & CSV recorder
│   ├── data/                              # Consolidated runtime data directory
│   │   ├── datasets/                      # Canonical JSON & CSV datasets & blank/sample templates
│   │   ├── runs/                          # Historical evaluation run folders & event logs
│   │   └── logs/                          # Server runtime logs
│   ├── static/                            # Modular JavaScript controllers & CSS stylesheets
│   │   ├── js/action-panel.js             # One-click dataset curation (Add/Replace Golden Source)
│   │   ├── js/testbed.js                  # Standalone parallel multi-connector testbed controller
│   │   ├── js/trace-inspector.js          # AI Root-Cause Diagnostician & waterfall inspector
│   │   ├── js/results-view.js             # 3-tier results scoreboard & multi-model comparison
│   │   ├── js/run-status.js               # Real-time SSE monitor & run cancellation
│   │   └── dist/eval-harness-bundle.js    # Compiled Lit UI component bundle
│   └── templates/                         # Modular HTML5 templates & partials
│       ├── index.html                     # Primary SPA entrypoint
│       ├── testbed.html                   # Dedicated standalone testbed (/test & /testbed)
│       └── partials/                      # Modular UI modal and screen templates
├── cli/                                   # Standalone CLI tools & diagnostics
│   ├── preflight_check.py                 # Automated preflight environment & ADC diagnostic verifier
│   └── probe_testbed.py                   # Parallel multi-connector CLI probe utility
└── config/                                # Declarative paths & environment configuration
    ├── paths.json                         # Centralized workspace directory mapping
    ├── paths.py                           # Typed PathConfig resolver (dynamically anchored to repo root)
    └── constants.py                       # Static schemas & environment bootstrapping
```

---

## ⚡ 2. Quick Onboarding Guide

### Step 0: Dependency Management (`uv`)
Strictly use [`uv`](https://github.com/astral-sh/uv) for hermetic dependency synchronization:
```bash
uv sync
```

### Step 1: Configure Environment Variables (`.env`)
Copy the clean example configuration template:
```bash
cp .env.example .env
```
Set your target GCP and evaluation parameters in `.env`:
```env
# REQUIRED: Target GCP Project & Vertex Search Engine ID
PROJECT_ID=<YOUR_GCP_PROJECT_ID>
ENGINE_ID=<YOUR_VERTEX_SEARCH_ENGINE_ID>
LOCATION=global
GOOGLE_GENAI_USE_VERTEXAI=True

# SEARCH MODE: 'streamAssist' (Agentic Multi-Turn) or 'Vector' (Vector Similarity)
SEARCH_MODE=Vector

# Eval Harness Web Port & Execution Mode
EVAL_HARNESS_PORT=8088
EVAL_HARNESS_OFFLINE=true
```

### Step 2: Authenticate with Google Cloud (ADC)
Generate Application Default Credentials (ADC) using your corporate identity:
```bash
gcloud auth application-default login
gcloud config set project <YOUR_GCP_PROJECT_ID>
```

### Step 3: Run Preflight Diagnostics
Verify that your credentials, environment parameters, and Discovery Engine target are valid before launching:
```bash
uv run python3 cli/preflight_check.py
```

The preflight verifier automatically performs four key diagnostic checks:
1. **Google Cloud ADC Check:** Verifies valid OAuth credentials and retrieves the authenticated user account email.
2. **Chrome CDP Remote Debugging Connection:** Probes for an active Chrome Remote Debugging session on port 9225 (automatically skipped when running in headless mode `EVAL_HARNESS_OFFLINE=true`).
3. **Gemini Enterprise Console Session:** Verifies that the browser session is signed in and navigated to the target Gemini Enterprise console tab.
4. **Environment Parameters & Live Endpoint Discovery:** Validates `PROJECT_ID`, `ENGINE_ID`, `LOCATION`, and sends a live REST probe to Discovery Engine to discover and list all attached Data Stores / Connectors.

---

## 🎛️ 3. Search Mode: Configuration & Control

The **Search Mode** controls the retrieval and generation protocol used by Gemini Enterprise across connectors:

| Search Mode Value | Protocol | Behavior |
| :--- | :--- | :--- |
| **`streamAssist`** *(Agentic)* | `:streamAssist` REST SSE API | Autonomous multi-turn agent that dynamically plans tool calls across attached connectors (Google Drive, Jira, Confluence, LumApps) and streams grounded markdown answers. |
| **`Vector`** | `:search` / Vector Embeddings | Direct vector semantic similarity search against indexed document chunks. |

### How Search Mode is Read & Controlled (Precedence Hierarchy):
1. **Dataset Scenario Level:** Any scenario in a dataset JSON/CSV can explicitly specify `"search_mode": "streamAssist"` or `"search_mode": "Vector"`.
2. **Web Portal UI (Run Configuration & Testbed):** The active mode selected on the **Run Configuration** screen or in the **Testbed** dropdown (`/test`) is passed directly in the benchmark payload (`POST /api/run_benchmark`).
3. **Environment Variable (`.env`):** `SEARCH_MODE=streamAssist` or `SEARCH_MODE=Vector` defines the server-wide default fallback.
4. **CLI Argument:** `probe_testbed.py --mode stream_assist` or `--mode vector`.

---

## 🚀 4. How to Run Evaluations

### Option A: Interactive Web Console GUI (Recommended)
Launch the FastAPI web server from the repository root:
```bash
uv run python3 -m ge_eval_harness.backend.app --port 8088
```
Open **`http://localhost:8088`** in your browser.

#### Core Workspaces:
* **🏠 Home:** Dashboard, run history, and quick-launch triggers.
* **📂 Datasets:** Canonical benchmark repository, inline scenario editor, and CSV template downloader.
* **⚙️ Run Configuration:** Multi-model matrix expansion (⚡ Gemini 3.5 Flash, 🧠 Gemini 3.1 Pro, 🌐 Glean Web), Search Mode, prompt presets, and concurrency.
* **📈 Run Status:** Real-time event log streamer, latency percentiles (TTFT, TTLT), and instant **🛑 Cancel Run** control.
* **📊 Results:** 3-tier accuracy scorecard (LLM Judge Pass, Evidence Match, Source Match), standout model comparison panels, and BigQuery exporter.
* **🧪 Test Bed (`/test`):** Dedicated parallel multi-connector sandbox for rapid live connector probing and prompt tuning.

---

### Option B: Standalone Parallel Testbed CLI
Probe connectors and test agentic reading directly from your terminal:
```bash
uv run python3 -m ge_eval_harness.cli.probe_testbed \
  --targets "https://drive.google.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO" \
  --query "how do I use python in Enterprise?" \
  --mode stream_assist
```

---

## 🧠 5. Key Platform Features

### 1. 3-Tier Accuracy Evaluation Framework
Disaggregates evaluation into three independent dimensions:
1. **🤖 LLM Judge Pass:** Semantic correctness and factual alignment against ground truth.
2. **📄 Evidence Match:** Grounding check verifying if cited document content factually substantiates the response.
3. **📎 Source Match:** Strict provenance check verifying if cited URLs/IDs match expected golden references.

### 2. AI Root-Cause Failure Diagnostician
Automatically triages non-passing scenarios into root causes:
* 🔴 `AUTH_SCOPE_MISSING`: OAuth/IAM token expired for the target connector.
* 🔴 `CONNECTOR_UNAVAILABLE`: DataStore unindexed or connector disabled.
* 🟡 `RETRIEVAL_EMPTY`: Vector search returned 0 document chunks.
* 🟢 `VALID_ALTERNATIVE_SOURCE`: Candidate cited an authoritative, grounded document missing from the dataset.
* ⚠️ `GROUND_TRUTH_WEAK`: Golden reference is unspecific or lacks required factual policies.
* ❌ `MODEL_HALLUCINATION`: Model claims facts unsupported by retrieved chunks.

### 3. Action Panel & Live Benchmark Curation
When a `VALID_ALTERNATIVE_SOURCE` is detected, the Action Panel allows benchmark engineers to:
* **"➕ Add to Golden Dataset":** Append verified internal documents to the benchmark dataset with one click.
* **"🔄 Replace Groundtruth Source":** Retire stale or deprecated links.

### 4. Reference Doc Quality Assessment
Audits golden references before grading:
* **🛡️ STRONG GOLDEN:** Verified authoritative document accessible under current credentials with facts matching ground truth.
* **⚠️ WEAK REFERENCE:** Document is unspecific or missing required factual policies.
* **🚫 INACCESSIBLE REF:** URL/ID returned HTTP 401/403/404 or timed out.
* **🚫 DOMAIN MISMATCH:** Reference belongs to an external domain outside corporate boundaries.

---

## 🧪 6. Automated Testing Battery

```bash
# Fast component unit tests (< 8s)
uv run pytest -v \
  tests/test_eval_harness_preflight.py \
  tests/test_eval_harness_config_env.py \
  tests/test_connector_testbed.py \
  tests/test_eval_harness_discovery_inspector.py \
  tests/test_eval_harness_latency.py

# Full Evaluation Harness Suite
uv run pytest -v tests/
```

---

*Gemini Enterprise Test Harness — Built for Enterprise & Google Cloud Benchmarking Engineering.*
