"""fyn statement parser service.

Stateless FastAPI sidecar: accepts a statement file plus an optional bank
hint and returns normalized transaction rows. The web app owns all
persistence; this service only parses bytes into JSON.
"""

from datetime import date

from fastapi import FastAPI, File, Form, UploadFile

from models import ParseResponse, ParsedRow, StatementPeriod

app = FastAPI(title="fyn parser", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/parse", response_model=ParseResponse, response_model_by_alias=True)
async def parse(
    file: UploadFile = File(...),
    bank: str | None = Form(None),
) -> ParseResponse:
    """Parse a statement into normalized rows.

    Placeholder implementation: returns one hardcoded row so the web <->
    parser dev loop can be verified end to end. Real extractors and the
    bank parser registry replace this body.
    """
    await file.read()  # drain the upload so clients never see truncation
    return ParseResponse(
        bank=bank or "generic",
        period=StatementPeriod(from_=date(2026, 6, 1), to=date(2026, 6, 30)),
        rows=[
            ParsedRow(
                date=date(2026, 6, 3),
                description="UPI-SWIGGY BANGALORE",
                amount=-450.0,
                type="debit",
                balance=12340.50,
                reference="UTR123456",
            )
        ],
        warnings=["parser scaffold: rows are placeholder data"],
    )
