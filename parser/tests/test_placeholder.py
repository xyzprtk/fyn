"""Smoke tests for the scaffolded parser service.

These pin the current placeholder behaviour (health check + parse contract
shape) and get replaced by real fixture tests when the bank parsers land.
"""

import io

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_parse_returns_contract_shape():
    files = {"file": ("statement.csv", io.BytesIO(b"date,amount\n"), "text/csv")}
    res = client.post("/parse", files=files, data={"bank": "kotak"})
    assert res.status_code == 200

    body = res.json()
    assert body["bank"] == "kotak"
    assert body["period"] == {"from": "2026-06-01", "to": "2026-06-30"}
    assert isinstance(body["warnings"], list)

    assert len(body["rows"]) == 1
    row = body["rows"][0]
    assert row["type"] in ("debit", "credit")
    assert isinstance(row["amount"], float)
    assert isinstance(row["flags"], list)


def test_parse_defaults_to_generic_bank():
    files = {"file": ("statement.csv", io.BytesIO(b"x"), "text/csv")}
    res = client.post("/parse", files=files)
    assert res.status_code == 200
    assert res.json()["bank"] == "generic"
