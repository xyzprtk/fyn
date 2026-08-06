"""PDF extraction via pdfplumber.

Tries the default ruling-line table strategy first (bank PDFs usually have
gridded tables). If a whole pass yields no rows, retries with a text-based
strategy for borderless statements. All pages' table rows are concatenated
into one RawDoc — repeated page headers are handled downstream as artifacts.
"""

import io

from extractors import ExtractionError
from heuristics import clean_description
from models import RawDoc

_TEXT_STRATEGY = {"vertical_strategy": "text", "horizontal_strategy": "text"}


def extract_pdf(data: bytes, filename: str) -> RawDoc:
    try:
        import pdfplumber
    except ImportError as exc:  # pragma: no cover - dependency is pinned
        raise ExtractionError("pdfplumber is not installed") from exc

    rows: list[list[str]] = []
    text = ""
    page_count = 0
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = pdf.pages
            page_count = len(pages)
            for page in pages:
                rows.extend(_page_rows(page, settings=None))
            if not rows:
                for page in pages:
                    rows.extend(_page_rows(page, settings=_TEXT_STRATEGY))
            if not rows:
                text = "\n".join(page.extract_text() or "" for page in pages)
    except Exception as exc:
        raise ExtractionError(f"could not read pdf: {exc}") from exc

    if not rows and not text.strip():
        raise ExtractionError("no extractable text or tables in pdf")
    return RawDoc(filename=filename, kind="pdf", rows=rows, text=text, page_count=page_count)


def _page_rows(page, settings: dict | None) -> list[list[str]]:
    tables = (
        page.extract_tables(table_settings=settings)
        if settings
        else page.extract_tables()
    )
    return [
        [clean_description(cell or "") for cell in row]
        for table in tables or []
        for row in table
    ]
