"""Endpoint contract tests for POST /parse."""

import io
import logging
from pathlib import Path

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
FIXTURES = Path(__file__).parent / "fixtures"


def upload(filename: str, data: bytes, content_type: str = "text/csv", **params):
    return client.post(
        "/parse",
        files={"file": (filename, io.BytesIO(data), content_type)},
        params=params,
    )


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_parse_logs_safe_timing(caplog):
    with caplog.at_level(logging.INFO, logger="fyn.parser"):
        res = upload("federal.csv", (FIXTURES / "federal.csv").read_bytes())

    assert res.status_code == 200
    assert "parse_complete kind=csv pages=1" in caplog.text
    assert "extracted_rows=" in caplog.text
    assert "parsed_rows=" in caplog.text
    assert "federal.csv" not in caplog.text


def test_parse_federal_contract():
    res = upload("federal.csv", (FIXTURES / "federal.csv").read_bytes())
    assert res.status_code == 200

    body = res.json()
    assert body["bank"] == "federal"
    assert body["period"] == {"from": "2026-06-25", "to": "2026-06-28"}
    assert len(body["rows"]) == 4

    first = body["rows"][0]
    assert first == {
        "date": "2026-06-25",
        "description": "UPIOUT/654240549874/q707628024@ybl/UPI/5814",
        "amount": -55.0,
        "type": "debit",
        "balance": 232.80,
        "reference": "654240549874",
        "flags": [],
    }

    flagged = body["rows"][3]
    assert flagged["flags"] == ["balance_mismatch"]
    assert body["warnings"] == ["2 header/footer artifact row(s) skipped"]


def test_bank_hint_as_query_param():
    res = upload("federal.csv", (FIXTURES / "federal.csv").read_bytes(), bank="generic")
    assert res.status_code == 200
    assert res.json()["bank"] == "generic"


def test_bank_hint_as_form_field():
    res = client.post(
        "/parse",
        files={"file": ("kotak.csv", io.BytesIO((FIXTURES / "kotak.csv").read_bytes()), "text/csv")},
        data={"bank": "kotak"},
    )
    assert res.status_code == 200
    assert res.json()["bank"] == "kotak"


def test_unsupported_file_type_is_422():
    payload = b"\x89PNG\r\n\x1a\n" + bytes(64)
    res = upload("photo.png", payload, "image/png")
    assert res.status_code == 422
    assert res.json()["detail"] == "unparseable_file"


def test_empty_file_is_422():
    res = upload("empty.csv", b"")
    assert res.status_code == 422
    assert res.json()["detail"] == "unparseable_file"


def test_period_is_null_when_no_rows():
    res = upload("junk.csv", b"a,b,c\n1,2,3\n4,5,6\n")
    assert res.status_code == 200
    body = res.json()
    assert body["bank"] == "generic"
    assert body["rows"] == []
    assert body["period"] is None
    assert body["warnings"] != []
