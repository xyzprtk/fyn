"""Data shapes for the parser service.

Two kinds of models live here:
- Contract models (pydantic): the JSON interface with the web app.
- RawDoc: what extractors produce and parsers consume — internal only.

The parser is stateless: it receives statement bytes and returns normalized
rows. Persistence is the web app's job.
"""

from dataclasses import dataclass
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DocKind = Literal["csv", "xlsx", "pdf"]


@dataclass
class RawDoc:
    """Best-effort extraction of a statement file.

    rows: tabular cells as raw strings (possibly ragged). For csv/xlsx this
    is every sheet row; for pdf it is the concatenated table rows of all
    pages. text: free text (pdf text layer, or the raw csv content; "" for
    xlsx) used for bank detection markers.
    """

    filename: str
    kind: DocKind
    rows: list[list[str]]
    text: str
    page_count: int = 1


class ParsedRow(BaseModel):
    date: date
    description: str
    amount: float  # signed: negative = debit, positive = credit
    type: Literal["debit", "credit"]
    balance: float | None = None  # running balance after the txn, if present
    reference: str | None = None  # UPI id / txn ref / cheque no.
    flags: list[str] = Field(default_factory=list)


class StatementPeriod(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_: date = Field(alias="from")
    to: date


class ParseResponse(BaseModel):
    bank: str
    period: StatementPeriod | None
    rows: list[ParsedRow]
    warnings: list[str] = Field(default_factory=list)
