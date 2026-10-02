"""
End-to-End integration test for Eval Harness Wizard Redesign flow.
Launches headless Chromium using Playwright, interacts with the new sidebar navigation,
steps through the dataset scenario editor and parameters configuration wizards,
triggers the live matrix evaluation run, and verifies logs progress streaming.
"""

import asyncio
import os
import unittest
import pytest
from playwright.async_api import async_playwright
from ge_eval_harness.config.paths import PATHS

@pytest.mark.slow
class TestEvalHarnessE2EWizard(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.portal_url = os.getenv("PORTAL_URL", "http://localhost:8095")
        self.server_proc = None
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                await client.get(self.portal_url, timeout=1.0)
        except Exception:
            import subprocess
            import sys
            repo_root = str(PATHS.repo_root)
            self.server_proc = subprocess.Popen(
                [sys.executable, "-c", "import uvicorn; from ge_eval_harness.backend.app import app; uvicorn.run(app, host='127.0.0.1', port=8095, log_level='warning')"],
                cwd=repo_root,
            )
            import httpx
            for _ in range(20):
                await asyncio.sleep(0.5)
                try:
                    async with httpx.AsyncClient() as client:
                        r = await client.get(self.portal_url, timeout=1.0)
                        if r.status_code == 200:
                            break
                except Exception:
                    pass

    async def asyncTearDown(self):
        if self.server_proc:
            self.server_proc.terminate()
            self.server_proc.wait()

    async def test_e2e_wizard_run_workflow(self):
        async with async_playwright() as p:
            # We can connect over CDP or launch a local headless browser.
            # To test using the user's running app, local browser is cleanest.
            browser = await p.chromium.launch(headless=True)
            
            # Set up page and listen to console and page errors
            page = await browser.new_page()
            page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.text}"))
            page.on("pageerror", lambda err: print(f"[BROWSER ERROR] {err}"))
            
            print(f"Navigating to {self.portal_url}...")
            await page.goto(self.portal_url)
            
            # Allow time for dynamic JS load
            await page.wait_for_timeout(2000)
            
            # 1. Verify Home screen elements exist
            header_title = page.locator("#screen-home h1")
            await expect_visible(header_title)
            self.assertEqual(await header_title.text_content(), "GE Eval Harness")
            
            # 2. Click "Start From Scratch" button trigger
            print("Clicking Start From Scratch button...")
            scratch_btn = page.locator("button:has-text('Start From Scratch')")
            await scratch_btn.click()
            await page.wait_for_timeout(1000)
            
            # Verify we are on Dataset Editor screen
            self.assertTrue(await page.locator("#screen-dataset-editor").is_visible())
            
            # 3. Modify scenario inputs in Dataset Editor table
            # Add a row since the dataset starts empty
            print("Clicking Add Row button to add a scenario...")
            add_row_btn = page.locator("button:has-text('➕ Add Row')")
            await add_row_btn.click()
            await page.wait_for_timeout(500)
            
            # Focused scenario editor is now visible
            print("Filling focused editor inputs for row 0...")
            query_input = page.locator("#focused-query, #focused-query textarea, textarea#focused-query").first
            await expect_visible(query_input)
            await query_input.fill("how does the wellness stipend work?")
            
            truth_input = page.locator("#focused-truth, #focused-truth textarea, textarea#focused-truth").first
            await truth_input.fill("Provides $150 reimbursement for fitness classes.")
            
            # Verify nested expected source links insertion in focused editor
            print("Adding dynamic source link input in focused editor...")
            await page.locator("button:has-text('➕ Add Link')").click()
            await page.wait_for_timeout(200)
            src_input = page.locator("input.focused-src-input, .focused-src-input").first
            await src_input.fill("https://drive.google.com/open?id=wellness_stipend_reimbursement")

            # Fill optional Glean Comparison fields
            print("Filling optional Glean comparison fields in focused editor...")
            glean_response_input = page.locator("#focused-glean-response, #focused-glean-response textarea, textarea#focused-glean-response").first
            await expect_visible(glean_response_input)
            await glean_response_input.fill("Glean Response: The wellness stipend is $150.")
            
            glean_sources_input = page.locator("#focused-glean-sources, #focused-glean-sources input, input#focused-glean-sources").first
            await expect_visible(glean_sources_input)
            await glean_sources_input.fill("https://drive.google.com/open?id=wellness_policy_glean")

            # Click Save to persist row 0 and return to list
            print("Saving scenario 0...")
            await page.locator("#btn-save-edit").click()
            await page.wait_for_timeout(500)

            # Verify row copying (duplication)
            print("Duplicating row 0 using Copy button in table...")
            await page.locator(".btn-copy-row, button.btn-copy-row").first.click()
            await page.wait_for_timeout(500)
            
            # Click Edit on the duplicated row 1 (which opens focused editor for row 1)
            print("Editing copied row 1...")
            await page.locator(".btn-edit-row").nth(1).click()
            await page.wait_for_timeout(500)
            
            # Verify row 1 was spawned with identical values
            query_input_focused = page.locator("#focused-query, #focused-query textarea, textarea#focused-query").first
            self.assertTrue(await query_input_focused.is_visible())
            self.assertEqual(await query_input_focused.input_value(), "how does the wellness stipend work?")
            
            # Modify query 1 in focused editor
            await query_input_focused.fill("what is the PTO rollover limit?")
            await page.locator("#focused-truth, #focused-truth textarea, textarea#focused-truth").first.fill("Up to 5 days rollover allowed.")

            # Verify data connectors toggle switch behavior in focused editor
            print("Toggling data connectors switch to NO (disable)...")
            enabled_switch = page.locator("#conn-enabled-switch")
            await enabled_switch.click()
            await page.wait_for_timeout(300)

            # Save the edits for row 1
            print("Saving scenario 1...")
            await page.locator("#btn-save-edit").click()
            await page.wait_for_timeout(500)
            
            # 4. Click "Next: Configure Parameters"
            next_btn = page.get_by_role("button", name="Next: Configure Parameters ➡️")
            await next_btn.click()
            await page.wait_for_timeout(1000)
            
            # Verify we are on Run Configuration screen
            self.assertTrue(await page.locator("#screen-run-config").is_visible())
            
            # 5. Modify Config Parameters: Set iteration select option to 1, models check, instruct override
            flash_chk = page.locator("#config-model-flash input")
            self.assertTrue(await flash_chk.is_checked())
            
            # Fill out instructions override
            override_text = "Answer in exactly 5 words."
            await page.locator("#config-instruction-override, textarea#config-instruction-override").first.fill(override_text)
            
            # 6. Click "Launch Evaluation Run"
            launch_btn = page.get_by_role("button", name="🚀 Launch Evaluation Run")
            print("Launching new wizard run...")
            await launch_btn.click()
            await page.wait_for_timeout(1000)
            
            # Verify we are navigated to the Run Status monitor screen
            self.assertTrue(await page.locator("#screen-run-status").is_visible())
            
            # 7. Poll Run Status events table log details for up to 30 seconds
            print("Waiting for event step logs to start streaming...")
            
            status_body = page.locator("#run-status-body")
            success = False
            for attempt in range(15):
                await asyncio.sleep(2)
                rows_count = await page.locator("#run-status-body tr").count()
                first_row_text = await page.locator("#run-status-body tr").first.text_content()
                
                print(f"  Attempt {attempt+1}: Found {rows_count} event rows. First row text: '{first_row_text.strip()}'")
                
                # Check if we got events instead of the placeholder text "Select a run..." or "Fetching log events..."
                if rows_count > 0 and "Fetching" not in first_row_text and "Select" not in first_row_text:
                    # Look for step name like "Init" or "REST API Benchmarks"
                    if "Init" in first_row_text or "Benchmarks" in first_row_text or "completed" in first_row_text.lower():
                        success = True
                        break
            
            self.assertTrue(success, "Event logs did not start streaming to the UI within timeout limits.")
            print("Success! Step event logs are streaming dynamically to the run status screen.")
            
            # 8. Check Results screen (Results menu sidebar item)
            results_nav = page.locator("button.nav-item:has-text('Results')")
            print("Switching screen to Results via sidebar navigation item...")
            await results_nav.click()
            await page.wait_for_timeout(1000)
            
            self.assertTrue(await page.locator("#screen-results").is_visible())
            print("Results screen verified visible!")

            # Verify Results Historical Run Dropdown Selector
            run_selector = page.locator("#results-run-selector")
            self.assertTrue(await run_selector.is_visible())
            options_count = await run_selector.locator("option").count()
            self.assertTrue(options_count >= 1, "Run selector has no options")
            selected_val = await run_selector.input_value()
            print(f"Results run selector active value: {selected_val}")
            self.assertTrue(bool(selected_val), "No run was auto-selected in Results dropdown")

            # Switch dropdown to Master Database to verify completed scenario rows and details panel
            print("Selecting Master Database from run selector dropdown...")
            await run_selector.select_option("master")
            await page.wait_for_timeout(1000)

            print("Clicking first table row to open details panel...")
            await page.wait_for_selector("#master-table tbody tr[id^='result-row-']", timeout=10000)
            first_row = page.locator("#master-table tbody tr[id^='result-row-']").first
            await first_row.click()
            await page.wait_for_timeout(1000)
            
            details_panel = page.locator("#results-full-screen-detail")
            self.assertTrue(await details_panel.is_visible(), "Full screen detail panel did not open after row click")
            
            print("Closing full screen detail panel using back button...")
            close_btn = page.locator("#results-full-screen-detail button:has-text('Back')").first
            await close_btn.click()
            await page.wait_for_timeout(1000)
            self.assertFalse(await details_panel.is_visible(), "Full screen detail panel remained visible after back button click")
            print("Full screen detail panel close verification successful!")
            
            # 9. Verify Run Status Auto-Selection fallback
            # Reload to clear javascript state (currentActiveMonitorRunId = null)
            print("Reloading page to clear active monitor state...")
            await page.reload()
            await page.wait_for_timeout(2000)
            
            # Click "Run Status" menu navigation item directly
            status_nav = page.locator("button.nav-item:has-text('Run Status'), .nav-item:has-text('Run Status')").first
            print("Clicking Run Status sidebar navigation directly with clean monitor state...")
            await status_nav.click()
            await page.wait_for_timeout(2000)
            
            # Verify status screen loads the logs of the recent run instead of displaying empty state
            status_subtitle = await page.locator("#status-subtitle-id").text_content()
            print(f"Direct navigation status subtitle: '{status_subtitle.strip()}'")
            self.assertIn("Monitoring Run ID:", status_subtitle)
            print("Direct navigation fallback successfully selected the most recent run and loaded logs!")
            
            # Verify TTLT Latency Percentiles Card on Run Status screen if run completed
            for _ in range(15):
                if await page.locator("#eval-api-ttlt-p50").is_visible():
                    break
                await page.wait_for_timeout(1000)

            eval_p50 = page.locator("#eval-api-ttlt-p50")
            if await eval_p50.is_visible():
                print(f"Eval API TTLT p50 text: {await eval_p50.text_content()}")
                print("TTLT Latency metrics card (p50, p95, max) verified visible!")

            # Close browser context
            await browser.close()

    async def test_e2e_wizard_csv_upload_workflow(self):
        """Verify uploading golden dataset CSV with markdown filenames transitions to Step 2 without blocking alerts."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # Record any alert dialogs
            dialog_messages = []
            page.on("dialog", lambda d: dialog_messages.append(d.message) or d.accept())

            await page.goto(self.portal_url)
            await page.wait_for_timeout(1500)

            # Upload google-team-gdrive_dev_golden.csv
            golden_csv_path = str(PATHS.get_dataset_path("google-team-gdrive_dev_golden.csv"))
            file_input = page.locator("#wizard-file-input")
            await file_input.set_input_files(golden_csv_path)
            await page.wait_for_selector("#screen-dataset-editor.active", timeout=10000)

            # Verify dataset editor screen is active
            self.assertTrue(await page.locator("#screen-dataset-editor").is_visible())

            # Click "Next: Configure Parameters ➡️"
            next_btn = page.get_by_role("button", name="Next: Configure Parameters ➡️")
            await next_btn.click()
            await page.wait_for_timeout(1000)

            # Assert that no blocking error alert was triggered
            self.assertEqual(dialog_messages, [], f"Unexpected alert triggered: {dialog_messages}")

            # Verify we are now on Run Config screen
            self.assertTrue(await page.locator("#screen-run-config").is_visible())

            await browser.close()

async def expect_visible(locator):
    is_visible = await locator.is_visible()
    if not is_visible:
        raise AssertionError(f"Element {locator} is not visible")

