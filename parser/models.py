"""Pydantic models for the parser contract (web <-> parser boundary).

The parser is stateless: it receives statement bytes and returns normalized
rows. Persistence is the web app's job, so these models are the whole
interface between the two services.
"""

from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


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
