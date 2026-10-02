"""
Safe HTML and Plain-Text Extraction Utilities.
Uses standard library streaming HTMLParser instead of vulnerable regular expressions (CWE-116).
"""

from html.parser import HTMLParser
from typing import List


class SafeHTMLStripper(HTMLParser):
    """
    Streaming HTML parser that strips markup and extracts visible text content
    without vulnerable regex-based tag filtering.
    """

    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text_chunks: List[str] = []
        self._ignore_depth = 0
        self.title = ""
        self._in_title = False

    def handle_starttag(self, tag: str, attrs):
        t = tag.lower()
        if t in ("script", "style", "head", "noscript", "svg", "template"):
            self._ignore_depth += 1
        elif t == "title":
            self._in_title = True

    def handle_endtag(self, tag: str):
        t = tag.lower()
        if t in ("script", "style", "head", "noscript", "svg", "template") and self._ignore_depth > 0:
            self._ignore_depth -= 1
        elif t == "title":
            self._in_title = False

    def handle_data(self, data: str):
        if self._in_title and not self.title:
            self.title = data.strip()
        if self._ignore_depth == 0:
            chunk = data.strip()
            if chunk:
                self.text_chunks.append(chunk)

    def get_text(self) -> str:
        return " ".join(self.text_chunks)


def strip_html_tags(raw_html: str) -> str:
    """Extracts plain text from HTML without regex tag-stripping."""
    if not raw_html or "<" not in raw_html:
        return raw_html or ""
    stripper = SafeHTMLStripper()
    stripper.feed(raw_html)
    return stripper.get_text()


def extract_html_text_and_title(raw_html: str) -> tuple[str, str]:
    """Extracts visible text content and page title from HTML markup."""
    if not raw_html or "<" not in raw_html:
        return (raw_html or "", "")
    stripper = SafeHTMLStripper()
    stripper.feed(raw_html)
    return (stripper.get_text(), stripper.title)
