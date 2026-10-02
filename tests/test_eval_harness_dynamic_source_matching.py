import asyncio
import os
import tempfile
import unittest
from unittest.mock import patch
import pytest

from ge_eval_harness.backend.config import ProtocolConfig, QueryScenarioConfig, expand_scenario_matrix
from ge_eval_harness.backend.services.citation_matcher import evaluate_citations
from ge_eval_harness.backend.services.unified_eval_service import execute_unified_evaluation


@pytest.mark.quick
class TestDynamicSourceMatchingLogic(unittest.TestCase):
    """
    Issue #18 Test Suite: Dynamic Source File Matching Logic.
    Validates citation evaluation across synthetic document IDs, filenames, URLs,
    delimited lists, and fallback behavior for unconstrained queries.
    """

    def test_match_by_google_drive_file_id(self):
        cited_urls = [
            "https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view",
            "https://intranet.enterprise.com/policies/general",
        ]
        res = evaluate_citations(cited_urls, expected_sources="19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9")
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["total_sources_count"], 2)
        self.assertEqual(res["additional_sources_count"], 1)

    def test_match_by_filename_and_slug(self):
        cited_urls = [
            "https://enterprise.atlassian.net/wiki/display/ENG/how_to_use_python_in_enterprise.md",
        ]
        # Match by exact filename
        res = evaluate_citations(cited_urls, expected_sources="how_to_use_python_in_enterprise.md")
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["total_sources_count"], 1)
        self.assertEqual(res["additional_sources_count"], 0)

        # Match by basename without path
        res2 = evaluate_citations(
            ["https://corp.enterprise.com/docs/gsd_walkup_windows_locations_and_hours.md"],
            expected_sources="gsd_walkup_windows_locations_and_hours.md",
        )
        self.assertTrue(res2["has_required_source"])

    def test_match_by_full_url(self):
        url = "https://enterprise.atlassian.net/jira/your-work/ticket/PROJ-1234"
        res = evaluate_citations([url], expected_sources=url)
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["total_sources_count"], 1)
        self.assertEqual(res["additional_sources_count"], 0)

    def test_match_by_list_and_pipe_separated_sources(self):
        cited_urls = [
            "https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view",
            "https://enterprise.atlassian.net/wiki/global_time_off_page.md"
        ]
        
        # Test list of multiple expected sources where both are cited
        res_list = evaluate_citations(
            cited_urls,
            expected_sources=["19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9", "global_time_off_page.md"]
        )
        self.assertTrue(res_list["has_required_source"])
        self.assertTrue(res_list["all_expected_matched"])
        self.assertEqual(res_list["total_sources_count"], 2)
        self.assertEqual(res_list["additional_sources_count"], 0)

        # Test pipe-separated string of sources
        res_pipe = evaluate_citations(
            cited_urls,
            expected_sources="19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9 | global_time_off_page"
        )
        self.assertTrue(res_pipe["has_required_source"])
        self.assertTrue(res_pipe["all_expected_matched"])

        # Test partial match: where only 1 of 2 expected sources was cited
        res_partial = evaluate_citations(
            ["https://enterprise.atlassian.net/wiki/global_time_off_page.md"],
            expected_sources=["19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9", "global_time_off_page.md"]
        )
        self.assertTrue(res_partial["has_required_source"])
        self.assertFalse(res_partial["all_expected_matched"])
        self.assertEqual(res_partial["additional_sources_count"], 0)

    def test_mismatch_returns_false(self):
        cited_urls = ["https://intranet.enterprise.com/irrelevant_doc.pdf"]
        res = evaluate_citations(cited_urls, expected_sources="19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9")
        self.assertFalse(res["has_required_source"])
        self.assertEqual(res["total_sources_count"], 1)
        self.assertEqual(res["additional_sources_count"], 1)

    def test_drive_url_different_file_ids_returns_false(self):
        # Two distinct Google Drive URLs with different file IDs must NOT match on generic '/open' path or 'open' basename
        cited_urls = ["https://drive.google.com/open?id=1UB4r70drMU5izq_JkhVcW3jvAvILXYiC"]
        expected = "https://drive.google.com/open?id=1hmGqbgWxK9u0IpAqZJIpURzEjPPTsq00"
        res = evaluate_citations(cited_urls, expected_sources=expected)
        self.assertFalse(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 0)
        self.assertEqual(res["total_sources_count"], 1)
        self.assertEqual(res["additional_sources_count"], 1)

    def test_empty_expected_sources_defaults_to_true(self):
        cited_urls = ["https://intranet.enterprise.com/any_doc.pdf", "https://enterprise.atlassian.net/wiki/page"]
        
        # None
        res_none = evaluate_citations(cited_urls, expected_sources=None)
        self.assertTrue(res_none["has_required_source"])
        self.assertEqual(res_none["total_sources_count"], 2)
        self.assertEqual(res_none["additional_sources_count"], 2)

        # Empty string
        res_str = evaluate_citations(cited_urls, expected_sources="")
        self.assertTrue(res_str["has_required_source"])

        # Empty list
        res_list = evaluate_citations(cited_urls, expected_sources=[])
        self.assertTrue(res_list["has_required_source"])

    def test_empty_citations(self):
        # Model returns no citations when source is required
        res = evaluate_citations([], expected_sources="https://service-central.enterprise.com/kb/123")
        self.assertFalse(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 0)
        self.assertEqual(res["total_sources_count"], 0)
        self.assertEqual(res["additional_sources_count"], 0)
        self.assertEqual(res["source_match_coverage"], 0.0)

        # Both cited URLs and expected sources are empty (unconstrained query)
        res_both_empty = evaluate_citations([], expected_sources="")
        self.assertTrue(res_both_empty["has_required_source"])
        self.assertEqual(res_both_empty["matched_sources_count"], 0)
        self.assertEqual(res_both_empty["total_sources_count"], 0)


    def test_tier_1_normalized_url_match(self):
        # Tracking query parameters, protocol changes, fragments, and trailing slash stripping
        cited = ["http://wiki.enterprise.net/display/BENEFITS/policy/?utm_source=slack&utm_medium=msg&usp=sharing#section2"]
        expected = "https://wiki.enterprise.net/display/BENEFITS/policy"
        res = evaluate_citations(cited, expected_sources=expected)
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 1)
        self.assertEqual(res["source_match_coverage"], 1.0)
        self.assertEqual(res["additional_sources_count"], 0)

    def test_tier_2_url_path_match(self):
        # Cross-domain alias path matching
        cited = ["https://wiki.enterprise.net/wiki/display/ENG/python_guidelines"]
        expected = "https://enterprise.atlassian.net/wiki/display/ENG/python_guidelines"
        res = evaluate_citations(cited, expected_sources=expected)
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 1)

    def test_tier_3_filename_and_stem_match(self):
        # Stem and extension matching
        cited = ["https://corp.enterprise.com/policies/2026_Enterprise_Benefits_Summary.pdf"]
        expected = "2026_Enterprise_Benefits_Summary"
        res = evaluate_citations(cited, expected_sources=expected)
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 1)

    def test_tier_4_slug_and_title_match(self):
        # Hyphen vs underscore vs space normalization
        cited = ["https://intranet.enterprise.com/articles/how-to-use-python-in-enterprise"]
        expected = "how_to_use_python_in_enterprise.md"
        res = evaluate_citations(cited, expected_sources=expected)
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 1)

    def test_tier_5_google_drive_symmetric_file_id_match(self):
        # Symmetric 28-44 char Drive file ID extraction across different Google Doc/Drive URL variants
        cited = ["https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing"]
        expected = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view"
        res = evaluate_citations(cited, expected_sources=expected)
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 1)

        # Raw Drive ID matching Google Docs URL
        res_raw = evaluate_citations(cited, expected_sources="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
        self.assertTrue(res_raw["has_required_source"])

    def test_tier_6_token_jaccard_fallback(self):
        # Token overlap for title-based links
        cited = ["https://intranet.enterprise.com/policies/enterprise-employee-wellness-reimbursement-handbook"]
        expected = "Enterprise Employee Wellness Reimbursement Guidelines"
        res = evaluate_citations(cited, expected_sources=expected)
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 1)

    def test_multi_source_json_array_parsing_and_metrics(self):
        # JSON array string input format
        cited = [
            "https://drive.google.com/file/d/19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9/view",
            "https://intranet.enterprise.com/policies/python_standard.md",
            "https://random-noise-link.com/article",
        ]
        expected_json = '["19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9", "python_standard.md", "missing_doc.pdf"]'
        res = evaluate_citations(cited, expected_sources=expected_json)
        self.assertTrue(res["has_required_source"])
        self.assertFalse(res["all_expected_matched"])
        self.assertEqual(res["matched_sources_count"], 2)
        self.assertEqual(res["expected_sources_count"], 3)
        self.assertAlmostEqual(res["source_match_coverage"], 0.667, places=3)
        self.assertEqual(res["total_sources_count"], 3)
        self.assertEqual(res["additional_sources_count"], 1)

    def test_config_scenario_matrix_expansion_with_dynamic_sources(self):
        config = ProtocolConfig(
            agent_ids=["core_assistant"],
            models=["gemini-3.5-flash"],
            instruction_sets=["Default"],
            connectors=["gdrive-connector"],
        )
        scenarios = [
            QueryScenarioConfig(
                query="what is the python standard?",
                ground_truth="python 3.12",
                expected_source="how_to_use_python_in_enterprise.md",
            ),
            QueryScenarioConfig(
                query="general question without required file",
                ground_truth="general answer",
                expected_sources=[],
            ),
        ]
        cells = expand_scenario_matrix(config, scenarios)
        self.assertEqual(len(cells), 2)
        self.assertEqual(cells[0]["expected_source"], "how_to_use_python_in_enterprise.md")
        self.assertEqual(cells[0]["expected_sources"], ["how_to_use_python_in_enterprise.md"])
        self.assertEqual(cells[1]["expected_source"], "")
        self.assertEqual(cells[1]["expected_sources"], [])

    def test_extract_source_urls_from_tool_call_chunks(self):
        from ge_eval_harness.backend.services.stream_assist_client import extract_source_urls_from_chunks
        chunks = [
            {
                "toolCall": {
                    "name": "google_drive_agent__download_file",
                    "args": {
                        "file_id": "10QsVyPIcWwMb8uK3_ylHqvxIkqtTMkQJ",
                        "name": "outdated_tls_1_0_sunset_notice.md"
                    }
                }
            },
            {
                "toolCall": {
                    "name": "jira_agent__get_issue",
                    "args": {
                        "issue_key": "PROJ-1234",
                        "url": "https://jira.enterprise.com/browse/PROJ-1234"
                    }
                }
            },
        ]
        urls = extract_source_urls_from_chunks(chunks)
        self.assertEqual(len(urls), 2)
        self.assertIn("https://drive.google.com/open?id=10QsVyPIcWwMb8uK3_ylHqvxIkqtTMkQJ", urls)
        self.assertIn("https://jira.enterprise.com/browse/PROJ-1234", urls)

    def test_markdown_embedded_citation_matching(self):
        res = evaluate_citations(
            source_urls=[],
            expected_sources="https://intranet.enterprise.com/policies/outdated_tls_1_0_sunset_notice.md",
            response_text="According to the outdated_tls_1_0_sunset_notice.md document, TLS 1.0 is sunsetted."
        )
        self.assertTrue(res["has_required_source"])
        self.assertEqual(res["matched_sources_count"], 1)

    @patch("ge_eval_harness.backend.services.unified_eval_service.run_concurrent_api_benchmarks")
    def test_unified_eval_service_integration_with_dynamic_sources(self, mock_benchmarks):
        config = ProtocolConfig(
            agent_ids=["core_assistant"],
            models=["gemini-3.5-flash"],
            iterations=1,
            max_concurrent_calls=2,
        )
        scenarios = [
            QueryScenarioConfig(
                query="how much is wellness stipend?",
                ground_truth="$150",
                expected_source="wellness_policy.md",
            ),
            QueryScenarioConfig(
                query="what are walkup hours?",
                ground_truth="9am - 5pm",
                expected_source="19L5YCsfAMd-6xdHyj2GkbPfP4807Xoj9",
            ),
        ]

        mock_benchmarks.return_value = [
            {
                "status_code": 200,
                "response_text": "Wellness stipend is $150.",
                "ttft_sec": 0.5,
                "ttlt_sec": 1.0,
                "response_word_count": 5,
                "generation_speed_tps": 5.0,
                "trace_id": "00000000000000000000000000000001",
                "span_id": "0000000000000001",
                "source_urls": ["https://intranet.enterprise.com/policies/wellness_policy.md"],
                "error_message": "",
            },
            {
                "status_code": 200,
                "response_text": "Walkup windows are open 9am - 5pm.",
                "ttft_sec": 0.4,
                "ttlt_sec": 0.8,
                "response_word_count": 6,
                "generation_speed_tps": 6.0,
                "trace_id": "00000000000000000000000000000002",
                "span_id": "0000000000000002",
                # Returns mismatched URL
                "source_urls": ["https://intranet.enterprise.com/wrong_doc.md"],
                "error_message": "",
            }
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            out_csv = os.path.join(tmpdir, "test_dynamic_results.csv")
            res = asyncio.run(
                execute_unified_evaluation(
                    protocol_config=config,
                    scenarios=scenarios,
                    output_csv_path=out_csv,
                    use_fallback_judge=True,
                )
            )
            records = res["records"]
            self.assertEqual(len(records), 2)
            
            # Record 1: matched wellness_policy.md
            self.assertTrue(records[0]["has_required_source"])
            self.assertEqual(records[0]["total_sources_count"], 1)
            self.assertEqual(records[0]["additional_sources_count"], 0)

            # Record 2: mismatched source
            self.assertFalse(records[1]["has_required_source"])
            self.assertEqual(records[1]["total_sources_count"], 1)
            self.assertEqual(records[1]["additional_sources_count"], 1)


if __name__ == "__main__":
    unittest.main()
