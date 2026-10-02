import asyncio
import os
import unittest
import pytest
from playwright.async_api import async_playwright

@pytest.mark.slow
class TestEvalHarnessE2EDatasets(unittest.IsolatedAsyncioTestCase):
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
            repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
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

    async def test_e2e_datasets_workflow(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.text}"))
            page.on("pageerror", lambda err: print(f"[BROWSER ERROR] {err}"))
            
            print(f"Navigating to {self.portal_url}...")
            await page.goto(self.portal_url)
            await page.wait_for_timeout(2000)

            # Verify Download CSV Template button on Home screen
            print("Verifying Download CSV Template button on Home screen...")
            home_dl_btn = page.locator("#btn-download-dataset-template-home")
            self.assertTrue(await home_dl_btn.is_visible())
            self.assertEqual(await home_dl_btn.get_attribute("href"), "/api/template/dataset")

            # Click on Datasets tab in sidebar
            print("Navigating to Datasets Screen...")
            datasets_tab = page.locator("button.nav-item:has-text('Datasets')")
            await datasets_tab.click()
            await page.wait_for_timeout(1000)
            
            # Verify datasets screen is active and has Download CSV Template button
            datasets_screen = page.locator("#screen-datasets")
            self.assertTrue(await datasets_screen.is_visible())
            ds_dl_btn = page.locator("#btn-download-dataset-template-datasets")
            self.assertTrue(await ds_dl_btn.is_visible())
            self.assertEqual(await ds_dl_btn.get_attribute("href"), "/api/template/dataset")
            
            # Verify preseeded datasets are present in the table
            print("Verifying preseeded datasets...")
            tbody = page.locator("#canonical-datasets-table-body, #datasets-table-body").first
            self.assertTrue(await tbody.locator("b", has_text="google-team-gdrive_dev_golden").first.is_visible())
            self.assertTrue(await tbody.locator("b", has_text="enterprise-team-full_enterprise_golden").first.is_visible())

            # Click Edit on google-team-gdrive_dev_golden
            print("Clicking Edit on google-team-gdrive_dev_golden...")
            edit_btn = tbody.locator("tr:has-text('google-team-gdrive_dev_golden') button:has-text('Edit')").first
            await edit_btn.click()
            await page.wait_for_timeout(1500)
            
            # Verify we are on dataset editor screen with Save Dataset button visible
            editor_screen = page.locator("#screen-dataset-editor")
            self.assertTrue(await editor_screen.is_visible())
            
            save_btn = page.locator("#btn-dataset-editor-save")
            self.assertTrue(await save_btn.is_visible())
            next_btn = page.locator("#btn-dataset-editor-next")
            self.assertFalse(await next_btn.is_visible())

            # Wait for editor to populate and check first query
            editor_comp = page.locator("dataset-editor")
            self.assertTrue(await editor_comp.locator("tr:has-text('how do I use python in Enterprise?')").is_visible())

            # Click Cancel to return to Datasets screen
            print("Cancelling edit...")
            cancel_btn = page.locator("#screen-dataset-editor button:has-text('Cancel')")
            await cancel_btn.click()
            await page.wait_for_timeout(1000)
            
            # Check we are back in the Datasets screen
            self.assertTrue(await datasets_screen.is_visible())

            # Test clicking "View" on google-team-single_sample_multi_datasource
            print("Clicking View on google-team-single_sample_multi_datasource...")
            view_btn = tbody.locator("tr:has-text('google-team-single_sample_multi_datasource') button:has-text('View')")
            if await view_btn.count() > 0:
                await view_btn.click()
                await page.wait_for_timeout(1000)
                viewer_screen = page.locator("#screen-dataset-viewer")
                self.assertTrue(await viewer_screen.is_visible())
                # Verify no error message in viewer
                self.assertFalse(await page.locator("text='Error loading dataset'").is_visible())
                viewer_sub = page.locator("#viewer-dataset-subtitle")
                self.assertTrue(await viewer_sub.is_visible())
                self.assertIn("1 scenario(s)", await viewer_sub.text_content())
                # Click back to Datasets
                await page.locator("#viewer-back-btn").click()
                await page.wait_for_timeout(1000)
                self.assertTrue(await datasets_screen.is_visible())
                print("Verified Dataset Viewer renders single_sample_multi_datasource cleanly!")
            
            # Verify Section 2: Historical Datasets has "Run ID" column header
            print("Verifying Historical Datasets table 'Run ID' column header...")
            hist_header = page.locator("#screen-datasets table").nth(1).locator("th").first
            self.assertEqual((await hist_header.text_content()).strip(), "Run ID")

            # Navigate to Run Status screen
            print("Navigating to Run Status screen to verify dataset link...")
            run_status_tab = page.locator("button.nav-item:has-text('Run Status'), .nav-item:has-text('Run Status')").first
            await run_status_tab.click()
            await page.wait_for_timeout(1500)

            run_status_screen = page.locator("#screen-run-status")
            self.assertTrue(await run_status_screen.is_visible())

            # Check if dataset link exists in run configuration parameters table
            dataset_link = page.locator("#btn-view-status-dataset")
            if await dataset_link.count() > 0:
                print("Clicking dataset link in Run Status configuration parameters table...")
                await dataset_link.click()
                await page.wait_for_timeout(1000)

                # Verify navigated to Dataset Viewer screen
                viewer_screen = page.locator("#screen-dataset-viewer")
                self.assertTrue(await viewer_screen.is_visible())

                # Click Back button and verify returned to Run Status screen
                viewer_back_btn = page.locator("#viewer-back-btn")
                await viewer_back_btn.click()
                await page.wait_for_selector("#screen-run-status.active, #screen-datasets.active", timeout=10000)
                self.assertTrue(await page.locator("#screen-run-status.active, #screen-datasets.active").is_visible())
                print("Verified roundtrip navigation between Run Status and Dataset Viewer!")

            await browser.close()

    async def test_dataset_template_and_import_schema(self):
        import httpx
        from ge_eval_harness.backend.app import app

        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            # 1. Test template download (headers only)
            res = await client.get("/api/template/dataset")
            self.assertEqual(res.status_code, 200)
            content = res.text
            lines = [line.strip() for line in content.strip().split("\n") if line.strip()]
            # Verify template headers match the 6 canonical columns
            self.assertGreaterEqual(len(lines), 1)
            self.assertEqual(lines[0], "query,ground_truth,expected_source,connector_id,glean_response_text,glean_source_urls")

            csrf_token = res.cookies.get("XSRF-TOKEN")
            headers = {"X-XSRF-TOKEN": csrf_token} if csrf_token else {}

            # 2. Test upload with full schema
            csv_payload = (
                "query,ground_truth,expected_source,connector_id,glean_response_text,glean_source_urls\n"
                "what is the vacation policy?,Take up to 20 days per year,https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view,gdrive_conn,Sample glean,https://glean.com/doc/1\n"
            )
            files = {"file": ("test.csv", csv_payload.encode("utf-8"), "text/csv")}
            res = await client.post("/api/upload/custom_dataset", files=files, headers=headers)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data.get("status"), "success")
            self.assertEqual(data.get("total_scenarios"), 1)
            scenarios = data.get("scenarios", [])
            self.assertEqual(scenarios[0]["query"], "what is the vacation policy?")
            self.assertEqual(scenarios[0]["ground_truth"], "Take up to 20 days per year")
            self.assertEqual(scenarios[0]["expected_source"], ["https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view"])
            self.assertEqual(scenarios[0]["connector_id"], "gdrive_conn")
            # 3. Test saving dataset with invalid source URL - must fail with HTTP 400
            invalid_payload = {
                "scenarios": [
                    {
                        "query": "Test invalid source",
                        "ground_truth": "Some answer",
                        "expected_source": ["kjkjkjk"],
                        "connector_id": "all"
                    }
                ]
            }
            res = await client.post("/api/datasets/test_invalid_ds", json=invalid_payload, headers=headers)
            self.assertEqual(res.status_code, 400)
            self.assertIn("Invalid expected source", res.json().get("detail", ""))

            # 4. Test saving dataset with valid sources - must succeed
            valid_payload = {
                "scenarios": [
                    {
                        "query": "Test valid sources",
                        "ground_truth": "Some valid answer",
                        "expected_source": [
                            "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
                            "https://drive.google.com/file/d/1b2b3c4d5e6f7g8h9i0j1k2l3m4n5o6q",
                            "https://drive.google.com/open?id=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p"
                        ],
                        "connector_id": "all"
                    }
                ]
            }
            res = await client.post("/api/datasets/test_valid_ds", json=valid_payload, headers=headers)
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json().get("status"), "success")

            # Cleanup test dataset
            await client.delete("/api/datasets/test_valid_ds", headers=headers)

    async def test_theme_toggle_and_high_contrast_styles(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(self.portal_url)
            await page.wait_for_timeout(1500)

            # Check default Light theme
            theme_btn = page.locator("#theme-toggle-btn")
            self.assertTrue(await theme_btn.is_visible())
            
            # Click Theme Toggle to switch to Dark Mode
            await theme_btn.click()
            await page.wait_for_timeout(500)
            theme_attr = await page.evaluate("() => document.documentElement.getAttribute('data-theme')")
            self.assertEqual(theme_attr, "dark")

            # Validate dark mode CSS variables
            dark_bg = await page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim()")
            dark_text = await page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim()")
            self.assertEqual(dark_bg, "#0b0f19")
            self.assertEqual(dark_text, "#f8fafc")

            # Click Theme Toggle to switch back to Light Mode
            await theme_btn.click()
            await page.wait_for_timeout(500)
            theme_attr_after = await page.evaluate("() => document.documentElement.getAttribute('data-theme')")
            self.assertEqual(theme_attr_after, "light")

            # Validate light mode CSS variables
            light_bg = await page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim()")
            light_text = await page.evaluate("() => getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim()")
            self.assertEqual(light_bg, "#f8fafd")
            self.assertEqual(light_text, "#1f1f1f")

            await browser.close()

if __name__ == "__main__":
    unittest.main()

