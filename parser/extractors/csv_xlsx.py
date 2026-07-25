"""CSV and XLSX extraction.

CSV uses the stdlib csv module on purpose: bank CSV exports are frequently
ragged (preamble lines with fewer columns than the table), which pandas'
C engine rejects. XLSX goes through pandas + openpyxl with dtype=str so
every cell arrives as a raw string for the bank parsers to interpret.
"""

import csv
import io

from extractors import ExtractionError
from models import RawDoc


def _decode(data: bytes) -> str:
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def extract_csv(data: bytes, filename: str) -> RawDoc:
    text = _decode(data)
    if not text.strip():
        raise ExtractionError("file is empty")

    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel

    rows = [
        [cell.strip() for cell in row]
        for row in csv.reader(io.StringIO(text), dialect)
    ]
    if not rows:
        raise ExtractionError("no rows found in csv")
    return RawDoc(filename=filename, kind="csv", rows=rows, text=text)


def extract_xlsx(data: bytes, filename: str) -> RawDoc:
    try:
        import pandas as pd

        frame = pd.read_excel(
            io.BytesIO(data),
            header=None,
            dtype=str,
            keep_default_na=False,
            sheet_name=0,
            engine="openpyxl",
        )
    except Exception as exc:
        raise ExtractionError(f"could not read xlsx: {exc}") from exc

    rows = [
        [str(cell).strip() for cell in row]
        for row in frame.itertuples(index=False, name=None)
    ]
    if not rows:
        raise ExtractionError("no rows found in xlsx")
    return RawDoc(filename=filename, kind="xlsx", rows=rows, text="")
