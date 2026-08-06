import pdfplumber

from extractors.pdf import extract_pdf


class _TablePage:
    def extract_tables(self, table_settings=None):
        return [[["Date", "Description"], ["2026-06-01", "Coffee"]]]

    def extract_text(self):
        raise AssertionError("text extraction should be skipped when tables exist")


class _TableDocument:
    pages = [_TablePage(), _TablePage()]

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False


def test_pdf_table_extraction_skips_full_text_pass(monkeypatch):
    monkeypatch.setattr(pdfplumber, "open", lambda *_args, **_kwargs: _TableDocument())

    raw = extract_pdf(b"%PDF-fake", "statement.pdf")

    assert raw.page_count == 2
    assert raw.text == ""
    assert len(raw.rows) == 4
