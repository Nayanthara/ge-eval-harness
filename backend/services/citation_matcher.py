#!/usr/bin/env python3
"""
6-Tier Citation Attribution Matching & Source Provenance Verification Engine.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional, Union
from urllib.parse import unquote, urlparse

TRACKING_QUERY_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "usp", "fbclid", "gclid", "ref", "ref_src", "source", "feature"
}

STOP_WORDS = {
    "the", "a", "an", "and", "or", "for", "with", "from", "that", "this",
    "http", "https", "com", "net", "org", "wiki", "display", "view", "edit",
    "open", "file", "document", "policies", "general", "docs", "html", "pdf", "md"
}

GENERIC_ROUTING_TOKENS = {
    "open", "view", "edit", "preview", "browse", "file", "files", "d", "u", "a", "uc",
    "document", "documents", "spreadsheets", "presentation", "forms", "drive", "home",
    "index", "default", "search", "api", "v1", "v2", "wiki", "display", "pages", "confluence"
}

CANONICAL_DOC_NAME_TO_URL = {
    "claude_onboarding_process.md": "https://drive.google.com/open?id=1V5c9f9PWY3RZQWhNjkJfbNlab_1Gp01e",
    "community_open_house.md": "https://drive.google.com/open?id=1mkx36voGKrMn-evuFZrablXO99sIk-PC",
    "contingent_worker_extension.md": "https://drive.google.com/open?id=1hmGqbgWxK9u0IpAqZJIpURzEjPPTsq00",
    "corporate_credit_card_expense_limits.md": "https://drive.google.com/open?id=1pt6Yx9_21Qm7DBdBi8cbNdgX9Sj5hma3",
    "eitai_in_progress_tickets.md": "https://drive.google.com/open?id=10LnLzfSfDTCSt0uQgN-OHb7yphYDL-Fa",
    "eitai_ready_for_acceptance_gary_yeung.md": "https://drive.google.com/open?id=1xeskKBo8s3T6GmBQugCSs4I-k1Hu8K9m",
    "global_time_off_page.md": "https://drive.google.com/open?id=1-gqMRZ1pj32QgwAJZ-XG4diUCZJEdUp2",
    "gsd_walkup_windows_locations_and_hours.md": "https://drive.google.com/open?id=13N44VqHee46G9uSsKgI09MueaYlUZh2s",
    "guest_wifi_access_instructions.md": "https://drive.google.com/open?id=1H6OPSQAdsDBjzGkjG52FOeGIYCLzGQKl",
    "hardware_refresh_cycle_macbook_2021.md": "https://drive.google.com/open?id=1AtUcVCAzTmz-uJ5TqmLiu05StJl5gYxc",
    "how_to_check_tls_cert.md": "https://drive.google.com/open?id=10QsVyPIcWwMb8uK3_ylHqvxIkqtTMkQJ",
    "how_to_use_python_at_yahoo.md": "https://drive.google.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO",
    "mounting_a_zip_file_as_a_volume.md": "https://drive.google.com/open?id=1xnruO_4OGmyCjqvi8A1QWyrLEo0BMljN",
    "user_onboarding_yo_konaplus_onboard.md": "https://drive.google.com/open?id=1rvsGPeDS5OS92dSBG2In7HjfqWaV3PPq",
    "vpn_cisco_anyconnect_legacy_guide.md": "https://drive.google.com/open?id=1towlgzkyZlRCqRE0X44gXI4gvT5wrq00",
    "wellness_stipend_reimbursement.md": "https://drive.google.com/open?id=1EG51BrIqhnJKW0LlcQxt0kwpp8O-MD1J",
    "work_from_abroad_policy.md": "https://drive.google.com/open?id=15STc5gr07FuChtiZ5xrmqOtB99DXQVLk",
    "yahoo_parking_and_commuter_benefits.md": "https://drive.google.com/open?id=1mkC9lhcarzOWQAzPEyVEi97J6Pb45rbG",
}


def is_valid_source_identifier(source: str) -> bool:
    if not source or not isinstance(source, str):
        return False
    s = source.strip()
    if not s:
        return False
    return bool(re.match(r"^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9*.]*\.[a-zA-Z]{2,}(?::\d+)?(?:\/.*)?$", s, re.IGNORECASE))


def _extract_drive_file_id(url_or_id: str) -> Optional[str]:
    if not url_or_id:
        return None
    s = unquote(str(url_or_id).strip())
    m1 = re.search(r"/d/([a-zA-Z0-9_-]{20,50})", s)
    if m1:
        return m1.group(1)
    m2 = re.search(r"[?&](?:id|doc)=([a-zA-Z0-9_-]{20,50})", s)
    if m2:
        return m2.group(1)
    if re.fullmatch(r"[a-zA-Z0-9_-]{20,50}", s):
        return s
    return None


def _normalize_url(url_str: str) -> str:
    if not url_str:
        return ""
    s = unquote(str(url_str).strip())
    if not re.match(r"^[a-zA-Z]+://", s):
        s = "https://" + s
    try:
        parsed = urlparse(s)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed.path.rstrip("/").lower()
        
        clean_qs = ""
        if parsed.query:
            from urllib.parse import parse_qsl, urlencode
            params = parse_qsl(parsed.query, keep_blank_values=False)
            filtered = [
                (k, v) for k, v in params
                if k.lower() not in TRACKING_QUERY_PARAMS and not k.lower().startswith("utm_")
            ]
            if filtered:
                clean_qs = urlencode(sorted(filtered))
        
        clean_url = f"{netloc}{path}"
        if clean_qs:
            clean_url = f"{clean_url}?{clean_qs}"
        return clean_url
    except Exception:
        return s.rstrip("/").lower()


def _slugify(text: str) -> str:
    if not text:
        return ""
    s = unquote(str(text).strip()).lower()
    base = os.path.basename(s)
    stem = os.path.splitext(base)[0]
    slug = re.sub(r"[^a-z0-9]+", "_", stem).strip("_")
    return slug


def _extract_word_tokens(text: str) -> set:
    if not text:
        return set()
    s = unquote(str(text).strip()).lower()
    words = re.findall(r"[a-z0-9]{3,}", s)
    return {w for w in words if w not in STOP_WORDS}


def _extract_source_tokens(src: str) -> List[str]:
    tokens = []
    s = str(src).strip()
    if not s:
        return tokens
    tokens.append(s.lower())

    drive_id = _extract_drive_file_id(s)
    if drive_id:
        tokens.append(drive_id.lower())

    try:
        parsed = urlparse(s if "://" in s else "https://" + s)
        if parsed.path and len(parsed.path) > 1:
            clean_path = parsed.path.rstrip("/").lower()
            tokens.append(clean_path)
            last_seg = clean_path.split("/")[-1]
            if len(last_seg) > 3:
                tokens.append(last_seg)
    except Exception:
        pass

    slug = _slugify(s)
    if slug and len(slug) > 3:
        tokens.append(slug)

    return list(dict.fromkeys(tokens))


def _match_single_source(cited_url: str, expected: str) -> bool:
    if not cited_url or not expected:
        return False

    cited_raw = str(cited_url).strip()
    exp_raw = str(expected).strip()
    if not cited_raw or not exp_raw:
        return False

    if exp_raw in CANONICAL_DOC_NAME_TO_URL:
        canon_url = CANONICAL_DOC_NAME_TO_URL[exp_raw]
        if _match_single_source(cited_raw, canon_url):
            return True

    cited_drive_id = _extract_drive_file_id(cited_raw)
    exp_drive_id = _extract_drive_file_id(exp_raw)
    
    if cited_drive_id and exp_drive_id:
        return cited_drive_id.lower() == exp_drive_id.lower()
    
    cited_clean = unquote(cited_raw).lower()
    exp_clean = unquote(exp_raw).lower()

    if exp_drive_id and exp_drive_id.lower() in cited_clean:
        return True
    if cited_drive_id and cited_drive_id.lower() in exp_clean:
        return True

    if exp_clean == cited_clean:
        return True

    norm_cited = _normalize_url(cited_raw)
    norm_exp = _normalize_url(exp_raw)
    if norm_cited and norm_exp:
        if norm_cited == norm_exp:
            return True
        if len(norm_exp) >= 15 and len(norm_cited) >= 15 and (norm_exp in norm_cited or norm_cited in norm_exp):
            return True

    try:
        p_cited = urlparse(cited_clean if "://" in cited_clean else "https://" + cited_clean).path.rstrip("/")
        p_exp = urlparse(exp_clean if "://" in exp_clean else "https://" + exp_clean).path.rstrip("/")
        p_exp_last = p_exp.split("/")[-1] if p_exp else ""
        
        if p_exp_last and p_exp_last not in GENERIC_ROUTING_TOKENS and len(p_exp_last) > 3:
            if p_cited and p_exp and len(p_exp) > 4 and len(p_cited) > 4:
                if p_cited == p_exp or p_cited.endswith(p_exp) or p_exp.endswith(p_cited):
                    return True
    except Exception:
        pass

    cited_path = urlparse(cited_clean).path or cited_clean
    exp_path = urlparse(exp_clean).path or exp_clean
    cited_base = os.path.basename(cited_path)
    exp_base = os.path.basename(exp_path)

    if cited_base and exp_base and cited_base not in GENERIC_ROUTING_TOKENS and exp_base not in GENERIC_ROUTING_TOKENS:
        if cited_base == exp_base:
            return True
        if len(exp_base) >= 5 and (exp_base in cited_base or cited_base in exp_base):
            return True

        cited_stem = os.path.splitext(cited_base)[0]
        exp_stem = os.path.splitext(exp_base)[0]
        if cited_stem and exp_stem and cited_stem not in GENERIC_ROUTING_TOKENS and exp_stem not in GENERIC_ROUTING_TOKENS:
            if cited_stem == exp_stem:
                return True
            if len(exp_stem) >= 5 and (exp_stem in cited_stem or cited_stem in exp_stem):
                return True

    slug_cited = _slugify(cited_clean)
    slug_exp = _slugify(exp_clean)
    if slug_cited and slug_exp and slug_cited not in GENERIC_ROUTING_TOKENS and slug_exp not in GENERIC_ROUTING_TOKENS:
        if slug_cited == slug_exp:
            return True
        if len(slug_exp) >= 6 and (slug_exp in slug_cited or slug_cited in exp_clean or slug_cited in slug_exp):
            return True

    tokens_cited = {t for t in _extract_word_tokens(cited_clean) if t not in GENERIC_ROUTING_TOKENS}
    tokens_exp = {t for t in _extract_word_tokens(exp_clean) if t not in GENERIC_ROUTING_TOKENS}
    if tokens_cited and tokens_exp:
        overlap = tokens_cited & tokens_exp
        union = tokens_cited | tokens_exp
        if union:
            jaccard = len(overlap) / len(union)
            overlap_exp_ratio = len(overlap) / len(tokens_exp)
            if jaccard >= 0.60 or (len(tokens_exp) >= 3 and overlap_exp_ratio >= 0.75):
                return True

    slug_tokens_cited = {t for t in _extract_word_tokens(slug_cited) if t not in GENERIC_ROUTING_TOKENS}
    slug_tokens_exp = {t for t in _extract_word_tokens(slug_exp) if t not in GENERIC_ROUTING_TOKENS}
    if slug_tokens_cited and slug_tokens_exp:
        slug_overlap = slug_tokens_cited & slug_tokens_exp
        slug_union = slug_tokens_cited | slug_tokens_exp
        if slug_union and (len(slug_overlap) / len(slug_union) >= 0.65):
            return True

    tokens = [t for t in _extract_source_tokens(expected) if t not in GENERIC_ROUTING_TOKENS]
    if any(tok in cited_clean for tok in tokens if len(tok) >= 5):
        return True

    return False


def _parse_expected_sources(exp_target: Any) -> List[str]:
    if exp_target is None:
        return []
    if isinstance(exp_target, (list, tuple, set)):
        result = []
        for item in exp_target:
            result.extend(_parse_expected_sources(item))
        return list(dict.fromkeys(result))
    
    s = str(exp_target).strip()
    if not s:
        return []

    if (s.startswith("[") and s.endswith("]")) or (s.startswith("(") and s.endswith(")")):
        try:
            parsed = json.loads(s)
            if isinstance(parsed, list):
                result = []
                for p in parsed:
                    result.extend(_parse_expected_sources(p))
                return list(dict.fromkeys(result))
        except Exception:
            pass

    if "|" in s:
        return [p.strip() for p in s.split("|") if p.strip()]

    if "," in s and not (s.startswith("http://") or s.startswith("https://")):
        return [p.strip() for p in s.split(",") if p.strip()]

    return [s]


def evaluate_citations(
    source_urls: List[str],
    expected_sources: Union[str, List[str], None] = None,
    expected_source: Union[str, List[str], None] = None,
    response_text: str = "",
) -> Dict[str, Any]:
    exp_target = expected_sources if expected_sources is not None else expected_source
    
    unique_cited = list(dict.fromkeys([str(u).strip() for u in source_urls if str(u).strip() and str(u).strip() != "None"])) if source_urls else []
    total_cnt = len(unique_cited)

    exp_list = _parse_expected_sources(exp_target)

    if not exp_list:
        return {
            "has_required_source": True,
            "all_expected_matched": True,
            "matched_sources_count": 0,
            "expected_sources_count": 0,
            "source_match_coverage": 1.0,
            "total_sources_count": total_cnt,
            "additional_sources_count": total_cnt,
            "matched_source_urls": [],
        }

    matched_cited = set()
    matched_expected = set()

    for exp in exp_list:
        for cited in unique_cited:
            if _match_single_source(cited, exp):
                matched_cited.add(cited)
                matched_expected.add(exp)

    if response_text:
        text_lower = response_text.lower()
        for exp in exp_list:
            if exp in matched_expected:
                continue
            exp_tokens = _extract_source_tokens(exp)
            for tok in exp_tokens:
                if len(tok) > 4 and tok in text_lower:
                    matched_cited.add(f"text_citation://{tok}")
                    matched_expected.add(exp)
                    break

    matched_cnt = len(matched_expected)
    has_req = len(matched_cited) > 0
    all_matched = (matched_cnt == len(exp_list))
    exp_total = len(exp_list)
    coverage = round(matched_cnt / max(1, exp_total), 3)
    effective_total = max(total_cnt, len(matched_cited))
    add_cnt = max(0, effective_total - len(matched_cited))

    return {
        "has_required_source": has_req,
        "evidence_match": has_req,
        "all_expected_matched": all_matched,
        "matched_sources_count": matched_cnt,
        "expected_sources_count": exp_total,
        "source_match_coverage": coverage,
        "total_sources_count": effective_total,
        "additional_sources_count": add_cnt,
        "matched_source_urls": list(matched_cited),
    }
