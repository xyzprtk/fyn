"""Statement file extraction: bytes -> RawDoc.

Kind detection trusts magic bytes first (%PDF, zip/xlsx), then the file
extension. Extraction failures raise ExtractionError, which the endpoint
turns into a 422 — the parser never returns partial garbage.
"""

from models import DocKind, RawDoc


class ExtractionError(Exception):
    """The file could not be decoded or read at all."""


from extractors.csv_xlsx import extract_csv, extract_xlsx  # noqa: E402
from extractors.pdf import extract_pdf  # noqa: E402

_PDF_MAGIC = b"%PDF"
_ZIP_MAGIC = b"PK\x03\x04"

_EXTRACTORS = {
    "csv": extract_csv,
    "xlsx": extract_xlsx,
    "pdf": extract_pdf,
}


def detect_kind(filename: str, data: bytes) -> DocKind | None:
    if data.startswith(_PDF_MAGIC):
        return "pdf"
    if data.startswith(_ZIP_MAGIC):
        return "xlsx"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in ("csv", "txt", "tsv"):
        return "csv"
    if ext == "xlsx":
        return "xlsx"
    if ext == "pdf":
        return "pdf"
    return None


def extract(kind: DocKind, data: bytes, filename: str) -> RawDoc:
    return _EXTRACTORS[kind](data, filename)
