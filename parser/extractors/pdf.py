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
    texts: list[str] = []
    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = list(pdf.pages)
            for page in pages:
                rows.extend(_page_rows(page, settings=None))
            if not rows:
                for page in pages:
                    rows.extend(_page_rows(page, settings=_TEXT_STRATEGY))
            for page in pages:
                texts.append(page.extract_text() or "")
    except Exception as exc:
        raise ExtractionError(f"could not read pdf: {exc}") from exc

    if not rows and not any(text.strip() for text in texts):
        raise ExtractionError("no extractable text or tables in pdf")
    return RawDoc(filename=filename, kind="pdf", rows=rows, text="\n".join(texts))


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
