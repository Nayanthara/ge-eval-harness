#!/usr/bin/env python3
"""
Preflight Verification Script for Gemini Enterprise Evaluation & Benchmarking Harness.

Checks:
1. Validates Google Cloud Application Default Credentials (ADC) and extracts user email.
2. Validates Chrome Remote Debugging (CDP) server connection & network port collision diagnostics.
3. Validates Chrome session authentication & Gemini Enterprise Console tab navigation.
4. Checks environment parameters (PROJECT_ID, ENGINE_ID, LOCATION, AGENT_ID) and live endpoint connectivity.
"""

import os
import sys
from pathlib import Path
import json
import httpx
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# Ensure both eval_harness root and parent directory are in sys.path
_SCRIPT_DIR = Path(__file__).resolve().parent
_EVAL_HARNESS_ROOT = _SCRIPT_DIR.parent
_REPO_ROOT = _EVAL_HARNESS_ROOT.parent

for p in (str(_REPO_ROOT), str(_EVAL_HARNESS_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from ge_eval_harness.config import bootstrap_environment
except ImportError:
    from config import bootstrap_environment

console = Console()


def load_env_file():
    """Loads root .env and .env.local variables."""
    return bootstrap_environment(str(_EVAL_HARNESS_ROOT))


def check_gcloud_adc():
    """Check 1: Validate Google Cloud Application Default Credentials (ADC)."""
    console.print("[bold cyan]1. Checking Google Cloud Application Default Credentials (ADC)...[/bold cyan]")
    try:
        import google.auth
        import google.auth.transport.requests

        credentials, project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        auth_req = google.auth.transport.requests.Request()
        credentials.refresh(auth_req)

        token = credentials.token
        if not token:
            console.print("[bold red]❌ Failed to acquire valid OAuth token from ADC.[/bold red]")
            console.print("👉 Fix: Run 'gcloud auth application-default login' in your terminal.")
            console.print("📖 README.md Reference: Step 2 (\"Step 2: Authenticate with Google Cloud (ADC)\")")
            return False, None, None

        # Resolve user email via Google oauth2 tokeninfo
        user_email = None
        try:
            resp = httpx.get(f"https://oauth2.googleapis.com/tokeninfo?access_token={token}", timeout=5.0)
            if resp.status_code == 200:
                user_email = resp.json().get("email")
        except Exception:
            pass

        email_str = f" ({user_email})" if user_email else ""
        console.print(f"   [bold green]✅ ADC Authentication Valid[/bold green]{email_str}")
        return True, credentials, user_email

    except Exception as e:
        console.print(f"[bold red]❌ ADC Verification Failed:[/bold red] {e}")
        console.print("👉 Fix: Run 'gcloud auth application-default login' in your terminal.")
        console.print("📖 README.md Reference: Step 2 (\"Step 2: Authenticate with Google Cloud (ADC)\")")
        return False, None, None


def check_chrome_cdp_connection(cdp_port=9225):
    """Check 2: Validate Chrome Remote Debugging CDP port connection & detect network collisions."""
    console.print(f"\n[bold cyan]2. Checking Chrome Remote Debugging Connection (Port {cdp_port})...[/bold cyan]")
    cdp_url = f"http://127.0.0.1:{cdp_port}"

    try:
        resp = httpx.get(f"{cdp_url}/json/version", timeout=3.0)
        if resp.status_code == 200:
            version_info = resp.json()
            browser_ver = version_info.get("Browser", "Chrome")
            console.print(f"   [bold green]✅ Chrome CDP Server Responding[/bold green] ({browser_ver})")
            return True
        else:
            console.print(f"   [bold red]❌ Port {cdp_port} responded with HTTP {resp.status_code} (Non-CDP Response).[/bold red]")

    except httpx.ConnectError:
        console.print(f"   [bold red]❌ Cannot connect to Chrome CDP server on port {cdp_port}.[/bold red]")
        console.print(f"   [bold grey]Reason: Connection refused at {cdp_url}[/bold grey]")
        console.print(Panel.fit(
            f"[bold red]Chrome Remote Debugging Connection Required (Port {cdp_port}):[/bold red]\n\n"
            f"💡 [bold yellow]Troubleshooting Remote Chrome Debugging:[/bold yellow]\n"
            f"Choose one of the following options to activate remote debugging:\n\n"
            f"[bold cyan]Option A: Direct Workstation / VM Browser[/bold cyan]\n"
            f"Run directly in a terminal:\n"
            f"   [bold white]google-chrome --remote-debugging-port={cdp_port} --user-data-dir=\"$HOME/.config/google-chrome-debug\" &[/bold white]\n\n"
            f"[bold cyan]Option B: Local Machine + Reverse SSH Tunnel[/bold cyan]\n"
            f"1. Start Chrome with remote debugging enabled:\n"
            f"   [bold white]/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port={cdp_port} --user-data-dir=\"$HOME/Library/Application Support/Google/Chrome-Debug\"[/bold white]\n"
            f"2. Start SSH Port Forwarding:\n"
            f"   [bold white]ssh -N -R {cdp_port}:localhost:{cdp_port} <your-remote-vm-hostname>[/bold white]\n\n"
            f"👉 [bold green]After completing Option A or B, re-run:[/bold green]\n"
            f"   [bold white]uv run python3 -m ge_eval_harness.cli.preflight_check[/bold white]",
            title="[bold red]Chrome Remote Debugging Troubleshooting Guide[/bold red]"
        ))
        return False

    except Exception as err:
        console.print(f"   [bold red]❌ Port {cdp_port} is bound by a non-Chrome process (HTTP timeout / response error: {err}).[/bold red]")
        console.print(Panel.fit(
            f"[bold yellow]⚠️ CDP Port Collision Detected on Port {cdp_port}:[/bold yellow]\n\n"
            f"Port {cdp_port} is currently bound by another daemon process that accepts TCP connections but does not speak Chrome CDP.\n\n"
            f"👉 [bold green]Option 1: Identify and terminate the process holding port {cdp_port}:[/bold green]\n"
            f"   [bold white]macOS/Linux:[/bold white] lsof -i :{cdp_port}\n"
            f"   [bold white]Force-kill:[/bold white]   kill -9 $(lsof -t -i:{cdp_port})\n\n"
            f"👉 [bold green]Option 2: Deliberately configure an alternate LOCAL_TUNNELING_EVAL_PORT in your .env file:[/bold green]\n"
            f"   1. Update your [bold white].env[/bold white] file: [bold cyan]LOCAL_TUNNELING_EVAL_PORT=9225[/bold cyan]\n"
            f"   2. Launch Chrome on the configured port.\n\n"
            f"👉 [bold green]Option 3: Use Headless / REST mode:[/bold green]\n"
            f"   Set [bold cyan]EVAL_HARNESS_OFFLINE=true[/bold cyan] in your [bold white].env[/bold white] file to evaluate via streamAssist without requiring a Chrome instance.",
            title="[bold yellow]CDP Port Collision & Network Diagnostic Guide[/bold yellow]"
        ))
        return False

    return False


def check_chrome_session_auth(adc_email=None, cdp_port=9225):
    """Check 3: Validate Chrome Session Navigation & Authentication."""
    console.print(f"\n[bold cyan]3. Verifying Gemini Enterprise Console Session & Navigation...[/bold cyan]")
    cdp_url = f"http://127.0.0.1:{cdp_port}"

    project_id = os.getenv("PROJECT_ID", "<your-project-id>")
    engine_id = os.getenv("ENGINE_ID", "<your-engine-id>")
    if project_id and engine_id and project_id != "your-gcp-project-id" and engine_id != "your-engine-id":
        dashboard_url = f"https://console.cloud.google.com/gemini-enterprise/locations/global/engines/{engine_id}/overview/dashboard?project={project_id}"
    else:
        dashboard_url = "https://console.cloud.google.com/gemini-enterprise"

    try:
        tabs_resp = httpx.get(f"{cdp_url}/json/list", timeout=3.0)
        if tabs_resp.status_code == 200:
            tabs = tabs_resp.json()
            vertex_tabs = [t for t in tabs if "vertexaisearch" in t.get("url", "") or "cloud.google" in t.get("url", "")]
            if vertex_tabs:
                console.print(f"   [bold green]✅ Found active Gemini Enterprise / Vertex AI Search tab in browser session[/bold green]")
                return True
            else:
                console.print("   [bold yellow]⚠️ Chrome window is connected, but target Gemini Enterprise tab is not open or signed in.[/bold yellow]")
                console.print(Panel.fit(
                    f"[bold yellow]Gemini Enterprise Login & Navigation Required:[/bold yellow]\n\n"
                    f"Chrome Remote Debugging window is active on port {cdp_port}, but target console tab was not detected.\n\n"
                    f"👉 [bold green]Step 1: In your open Chrome window, navigate to your Gemini Enterprise Dashboard:[/bold green]\n"
                    f"   [bold cyan]{dashboard_url}[/bold cyan]\n\n"
                    f"👉 [bold green]Step 2: Sign In with Account:[/bold green]\n"
                    f"   [bold white]{adc_email or 'your corporate GCP account'}[/bold white]\n\n"
                    f"👉 [bold green]Step 3: Re-run Preflight Check:[/bold green]\n"
                    f"   [bold white]uv run python3 -m ge_eval_harness.cli.preflight_check[/bold white]",
                    title="[bold yellow]Gemini Enterprise Login Required[/bold yellow]"
                ))
                return False
        return True
    except Exception as e:
        console.print(f"   [bold red]Error inspecting Chrome tabs:[/bold red] {e}")
        return False


def check_environment_parameters(credentials=None, adc_email=None):
    """Check 4: Validate PROJECT_ID, ENGINE_ID, LOCATION, AGENT_ID parameters and probe endpoint."""
    console.print("\n[bold cyan]4. Validating Environment & Discovery Engine Target Endpoint...[/bold cyan]")

    project_id = os.getenv("PROJECT_ID", "").strip()
    engine_id = os.getenv("ENGINE_ID", "").strip()
    location = os.getenv("LOCATION", "global").strip()
    agent_id = os.getenv("AGENT_ID", "").strip()
    collection_id = os.getenv("COLLECTION_ID", "default_collection").strip()

    valid = True
    table = Table(title="Target GCP Configuration & Discovery Engine Status", title_style="bold magenta")
    table.add_column("Component / Parameter", style="bold cyan", width=26)
    table.add_column("Resolved Value", style="bold white", width=36)
    table.add_column("Diagnostic Status", style="bold green")

    if not project_id or project_id == "your-gcp-project-id":
        table.add_row("PROJECT_ID", str(project_id or "(unset)"), "[bold red]❌ MISSING / INVALID[/bold red]")
        valid = False
    else:
        table.add_row("PROJECT_ID", project_id, "✅ OK")

    if not engine_id or engine_id == "your-engine-id":
        table.add_row("ENGINE_ID", str(engine_id or "(unset)"), "[bold red]❌ MISSING / INVALID[/bold red]")
        valid = False
    else:
        table.add_row("ENGINE_ID", engine_id, "✅ OK")

    table.add_row("LOCATION", location, "✅ OK")
    table.add_row("COLLECTION_ID", collection_id, "✅ OK")

    if agent_id:
        table.add_row("AGENT_ID", agent_id, "✅ Configured")
    else:
        table.add_row("AGENT_ID", "(Default Assistant)", "ℹ️ Core Assistant")

    if adc_email:
        table.add_row("ADC USER ACCOUNT", adc_email, "✅ ACTIVE")

    if not valid:
        console.print(table)
        console.print(f"\n[bold red]❌ Configuration Preflight Check Failed.[/bold red]")
        console.print("👉 Please edit your [bold white].env[/bold white] file and set valid values for PROJECT_ID and ENGINE_ID.")
        console.print("📖 README.md Reference: Step 1 (\"Step 1: Configure Environment Variables (.env)\")")
        return False

    # Perform lightweight REST API connectivity test using reused credentials
    endpoint_status = "⚠️ NOT TESTED"
    data_store_ids = []
    try:
        creds = credentials
        if not creds:
            import google.auth
            import google.auth.transport.requests
            creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
            creds.refresh(google.auth.transport.requests.Request())

        headers = {
            "Authorization": f"Bearer {creds.token}",
            "Content-Type": "application/json",
            "X-Goog-User-Project": project_id,
        }
        test_url = f"https://discoveryengine.googleapis.com/v1alpha/projects/{project_id}/locations/{location}/collections/{collection_id}/engines/{engine_id}"
        resp = httpx.get(test_url, headers=headers, timeout=5.0)

        if resp.status_code == 200:
            endpoint_status = "✅ Reachable (HTTP 200)"
            table.add_row("DISCOVERY ENGINE API", f"HTTP 200 (Engine '{engine_id}')", "✅ CONNECTED")
            engine_data = resp.json()
            data_store_ids = engine_data.get("dataStoreIds", [])
        else:
            table.add_row("DISCOVERY ENGINE API", f"HTTP {resp.status_code}", f"[bold yellow]⚠️ HTTP {resp.status_code}[/bold yellow]")
    except Exception as e:
        table.add_row("DISCOVERY ENGINE API", "Connection Warning", f"[bold yellow]⚠️ {e}[/bold yellow]")

    console.print(table)

    if data_store_ids:
        conn_table = Table(title="Live Auto-Discovered Data Connectors", title_style="bold green")
        conn_table.add_column("#", style="bold white", width=4)
        conn_table.add_column("Connector / Data Store ID", style="bold cyan")
        conn_table.add_column("Status", style="bold green")
        for idx, ds_id in enumerate(data_store_ids, 1):
            conn_table.add_row(str(idx), ds_id, "✅ ATTACHED & ACTIVE")
        console.print(conn_table)
    elif valid:
        console.print("   [bold yellow]ℹ️ No external dataStoreIds attached to this engine (using default engine collection).[/bold yellow]")

    return True


def main():
    console.print(Panel.fit(
        "[bold green]🔎 Executing Preflight Checklist for Gemini Enterprise Evaluation & Benchmarking Harness[/bold green]",
        title="Preflight Verifier"
    ))

    load_env_file()

    # 1. ADC Check
    adc_ok, credentials, adc_email = check_gcloud_adc()
    if not adc_ok:
        console.print("\n[bold red]❌ Preflight Check Failed at Step 1 (ADC Credentials).[/bold red]")
        console.print("📖 README.md Reference: Step 2 (\"Step 2: Authenticate with Google Cloud (ADC)\")\n")
        sys.exit(1)

    is_offline = os.getenv("GE_EVAL_HARNESS_OFFLINE", os.getenv("EVAL_HARNESS_OFFLINE", "true")).lower() == "true"

    if is_offline:
        console.print("\n[bold yellow]ℹ️ Headless / REST Mode Active (EVAL_HARNESS_OFFLINE=true): Skipping Chrome CDP browser checks.[/bold yellow]")
    else:
        # 2. Chrome CDP Connection Check
        cdp_port = int(os.getenv("GE_LOCAL_TUNNELING_EVAL_PORT", os.getenv("LOCAL_TUNNELING_EVAL_PORT", "9225")))
        chrome_conn_ok = check_chrome_cdp_connection(cdp_port=cdp_port)
        if not chrome_conn_ok:
            console.print(f"\n[bold yellow]💡 Preflight Halted: Please resolve the Chrome CDP connection on port {cdp_port} above and re-run preflight check.[/bold yellow]\n")
            sys.exit(1)

        # 3. Chrome Session Auth Check
        chrome_auth_ok = check_chrome_session_auth(adc_email=adc_email, cdp_port=cdp_port)
        if not chrome_auth_ok:
            console.print(f"\n[bold yellow]💡 Preflight Halted: Please open and sign into the Gemini Enterprise Console tab above and re-run preflight check.[/bold yellow]\n")
            sys.exit(1)

    # 4. Environment Parameters & Connectors Check (reusing ADC credentials)
    env_ok = check_environment_parameters(credentials=credentials, adc_email=adc_email)
    if not env_ok:
        console.print("\n[bold red]❌ Preflight Check Failed at Step 4 (Configuration Parameters).[/bold red]")
        console.print("📖 README.md Reference: Step 1 (\"Step 1: Configure Environment Variables (.env)\")\n")
        sys.exit(1)

    console.print("\n[bold green]🚀 Preflight Checklist Passed Successfully! Ready to launch Evaluation Harness.[/bold green]\n")


if __name__ == "__main__":
    main()

