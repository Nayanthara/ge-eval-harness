# /// script
# dependencies = [
#   "httpx>=0.25.0",
#   "google-auth>=2.23.0",
#   "opentelemetry-api",
#   "opentelemetry-sdk",
#   "opentelemetry-exporter-gcp-trace"
# ]
# ///

import asyncio

import os
import secrets
import httpx
import google.auth
from google.auth.transport.requests import Request

# OpenTelemetry Imports
from opentelemetry import trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configuration
PROJECT_ID = os.getenv("PROJECT_ID", os.getenv("GCP_PROJECT", "current-project"))
ENGINE_ID = os.getenv("ENGINE_ID", os.getenv("APP_ID", "default_assistant"))
LOCATION = os.getenv("LOCATION", "global")

URL = f"https://discoveryengine.googleapis.com/v1alpha/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{ENGINE_ID}/assistants/default_assistant:streamAssist"


# 1. Initialize OpenTelemetry with GCP Exporter
trace.set_tracer_provider(TracerProvider())
cloud_trace_exporter = CloudTraceSpanExporter(project_id=PROJECT_ID)
trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(cloud_trace_exporter))
tracer = trace.get_tracer(__name__)

def get_valid_token() -> str:
    """Gets a valid Google ADC token."""
    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    if not creds.valid:
        creds.refresh(Request())
    return creds.token

async def main():
    # 2. Start a Local Span (This represents the FastMCP server/client hop)
    with tracer.start_as_current_span("client-stream-assist-call") as active_span:
        
        ctx = active_span.get_span_context()
        # Extract IDs in hex format for visibility
        trace_id = format(ctx.trace_id, "032x")
        span_id_hex = format(ctx.span_id, "016x")
        
        print(f"Generated Trace ID: {trace_id}")
        print(f"Generated Span ID (Client): {span_id_hex}")
        
        token = get_valid_token()
        
        # 3. Construct W3C traceparent header using the SDK's generated IDs
        traceparent = f"00-{trace_id}-{span_id_hex}-01"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": PROJECT_ID,
            "traceparent": traceparent
        }
        
        payload = {
            "query": {"text": "Explain distributed tracing in one sentence."},
            "assistSkippingMode": "REQUEST_ASSIST",
            "answerGenerationMode": "NORMAL",
            "agentsSpec": {
                "agentSpecs": [
                    {
                        "agentId": "core_assistant"
                    }
                ]
            },
            "toolsSpec": {"vertexAiSearchSpec": {}},
        }
        
        print(f"Sending request to {URL}")
        
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", URL, headers=headers, json=payload, timeout=60.0) as resp:
                resp.raise_for_status()
                async for raw in resp.aiter_text():
                    print(raw, end="")
        print("\nRequest finished.")
        
        # Save trace info to a file for convenience
        with open("last_trace.env", "w") as f:
            f.write(f"TRACE_ID={trace_id}\n")
            f.write(f"SPAN_ID={span_id_hex}\n")
        print("Trace info saved to last_trace.env")

if __name__ == "__main__":
    asyncio.run(main())
    
    # Ensure all spans are flushed before exit
    try:
        trace.get_tracer_provider().shutdown()
    except Exception:
        pass

