"""fyn statement parser service.

Stateless FastAPI sidecar: accepts a statement file plus an optional bank
hint and returns normalized transaction rows. The web app owns all
persistence; this service only parses bytes into JSON.

Bank hint is accepted both as a query param (?bank=generic) and as a
multipart form field, so curl checks and the web proxy both work.
"""

from fastapi import FastAPI, File, Form, Query, UploadFile
from fastapi.responses import JSONResponse

from extractors import ExtractionError, detect_kind, extract
from models import ParseResponse, ParsedRow, StatementPeriod
from parsers.registry import resolve

app = FastAPI(title="fyn parser", version="0.3.0")

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # keep in sync with the web upload limit


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/parse", response_model=ParseResponse, response_model_by_alias=True)
async def parse(
    file: UploadFile = File(...),
    bank: str | None = Query(default=None),
    bank_form: str | None = Form(default=None, alias="bank"),
):
    data = await file.read()
    if not data:
        return _unparseable("empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        return _unparseable("file exceeds the 10 MB limit")

    filename = file.filename or "statement"
    kind = detect_kind(filename, data)
    if kind is None:
        return _unparseable(f"unsupported file type: {filename}")

    try:
        raw = extract(kind, data, filename)
    except ExtractionError as exc:
        return _unparseable(str(exc))

    parser = resolve(bank or bank_form, raw)
    outcome = parser.parse(raw)
    return ParseResponse(
        bank=parser.bank,
        period=_derive_period(outcome.rows),
        rows=outcome.rows,
        warnings=outcome.warnings,
    )


def _unparseable(reason: str) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": "unparseable_file", "reason": reason},
    )


def _derive_period(rows: list[ParsedRow]) -> StatementPeriod | None:
    if not rows:
        return None
    dates = [row.date for row in rows]
    return StatementPeriod(from_=min(dates), to=max(dates))
