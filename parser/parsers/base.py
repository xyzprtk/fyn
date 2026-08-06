"""Shared engine for tabular bank statement parsing.

Each bank file in this package contributes a BankProfile (column aliases,
date formats, detection markers). The TabularBankParser engine here does the
real work, which keeps adding a bank to: one new profile + one registry
line — no engine changes.

Alias conventions: aliases are stored normalized — lowercase, punctuation
collapsed to single spaces (e.g. the header "Chq/Ref No." normalizes to
"chq ref no", so the alias is "chq ref no").
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Protocol

from heuristics import (
    BAD_DATE,
    EMPTY_DESCRIPTION,
    POSSIBLE_ARTIFACT,
    ZERO_AMOUNT,
    clean_description,
    extract_reference,
    flag_balance_chain,
    is_strong_artifact,
    is_weak_artifact,
)
from models import ParsedRow, RawDoc

MAX_HEADER_SCAN_ROWS = 15


class BankParser(Protocol):
    bank: str

    def detect(self, raw: RawDoc) -> float:
        """0..1 confidence that this parser owns the document."""
        ...

    def parse(self, raw: RawDoc) -> ParseOutcome: ...


@dataclass
class ParseOutcome:
    rows: list[ParsedRow]
    warnings: list[str] = field(default_factory=list)


_DR_CR_SUFFIX_RE = re.compile(r"[\s(]*(dr|cr)\)?\.?$", re.IGNORECASE)
_CURRENCY_RE = re.compile(r"₹|\b(?:rs|inr)\b\.?", re.IGNORECASE)


def parse_amount(text: str) -> tuple[float, str | None] | None:
    """Parse an amount cell into (value, dr/cr hint).

    Handles Indian grouping ("1,23,456.00"), ₹/Rs prefixes, parentheses
    negatives, and Dr/Cr suffixes ("450.00 Dr"). The returned value carries
    the numeric sign (leading - or parentheses); the hint tells callers how
    to interpret magnitude for Dr/Cr-style columns.
    """
    s = text.strip()
    if not s:
        return None

    hint: str | None = None
    match = _DR_CR_SUFFIX_RE.search(s)
    if match:
        hint = match.group(1).lower()
        s = s[: match.start()].strip()

    negative = False
    if s.startswith("(") and s.endswith(")"):
        negative = True
        s = s[1:-1].strip()

    s = _CURRENCY_RE.sub("", s).replace(",", "").replace(" ", "")
    if s.startswith("-"):
        negative = True
        s = s[1:]
    if s.startswith("+"):
        s = s[1:]
    if not s:
        return None
    try:
        value = float(s)
    except ValueError:
        return None
    if not math.isfinite(value):
        return None
    return (-value if negative else value), hint


def apply_hint(value: float, hint: str | None) -> float:
    """Resolve a parsed amount under a Dr/Cr convention."""
    if hint == "dr":
        return -abs(value)
    if hint == "cr":
        return abs(value)
    return value


_FALLBACK_FORMATS = (
    "%Y-%m-%d",
    "%Y-%m-%d %H:%M:%S",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%d.%m.%Y",
    "%d %m %Y",
    "%d-%m-%y",
    "%d/%m/%y",
    "%d.%m.%y",
    "%d-%b-%Y",
    "%d %b %Y",
    "%d/%b/%Y",
    "%d.%b.%Y",
    "%d-%b-%y",
    "%d %b %y",
    "%d-%B-%Y",
    "%d %B %Y",
    "%Y/%m/%d",
)

_NUMERIC_DATE_RE = re.compile(r"^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$")


def parse_date(text: str, formats: tuple[str, ...] = ()) -> date | None:
    """Strict date parse: profile formats first (per-bank dayfirst config),
    then a conservative fallback list. Month-first numeric dates are NOT in
    the fallback on purpose — that ambiguity is the generic parser's job."""
    s = text.strip()
    if not s:
        return None
    for fmt in (*formats, *_FALLBACK_FORMATS):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def parse_numeric_date(text: str) -> tuple[date, bool] | None:
    """Parse a fully numeric date (03/06/2026), reporting day/month
    ambiguity: returns (chosen_date, ambiguous). Dayfirst wins ties —
    these are Indian bank statements."""
    match = _NUMERIC_DATE_RE.match(text.strip())
    if not match:
        return None
    first, second, year = (int(part) for part in match.groups())
    if year < 100:
        year += 2000

    def build(day: int, month: int) -> date | None:
        try:
            return date(year, month, day)
        except ValueError:
            return None

    dayfirst = build(first, second)
    monthfirst = build(second, first)
    if dayfirst and (not monthfirst or first == second):
        return dayfirst, False
    if dayfirst and monthfirst:
        return dayfirst, True  # both valid, differ -> ambiguous
    if monthfirst:
        return monthfirst, False
    return None


def _norm_header(cell: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", cell.lower()).strip()


def _find_col(headers: list[str], aliases: tuple[str, ...]) -> int | None:
    """Find a column index by alias: exact, then prefix-word, then
    containment. Fuzzy passes ignore short aliases (< 3 chars) so a bare
    "dr" can't swallow a trailing "Dr/Cr" direction column."""
    for i, header in enumerate(headers):
        if header in aliases:
            return i
    for i, header in enumerate(headers):
        if any(len(alias) >= 3 and header.startswith(alias + " ") for alias in aliases):
            return i
    for i, header in enumerate(headers):
        if any(len(alias) >= 4 and alias in header for alias in aliases):
            return i
    return None


def match_headers(
    cells: list[str], aliases_by_field: dict[str, tuple[str, ...]]
) -> dict[str, int]:
    norm = [_norm_header(cell) for cell in cells]
    mapping: dict[str, int] = {}
    for field_name, aliases in aliases_by_field.items():
        col = _find_col(norm, aliases)
        if col is not None:
            mapping[field_name] = col
    return mapping


def _has_direction(mapping: dict[str, int]) -> bool:
    return any(key in mapping for key in ("debit", "credit", "amount"))


def find_header(
    rows: list[list[str]], aliases_by_field: dict[str, tuple[str, ...]]
) -> tuple[int | None, dict[str, int] | None]:
    """Locate the header row within the first rows of the statement.
    Requires at least date + description + a debit/credit/amount column."""
    best: tuple[int, dict[str, int]] | None = None
    for idx, cells in enumerate(rows[:MAX_HEADER_SCAN_ROWS]):
        mapping = match_headers(cells, aliases_by_field)
        if not (
            "date" in mapping and "desc" in mapping and _has_direction(mapping)
        ):
            continue
        if best is None or len(mapping) > len(best[1]):
            best = (idx, mapping)
    if best is None:
        return None, None
    return best


@dataclass(frozen=True)
class BankProfile:
    bank: str
    markers: tuple[str, ...]  # lowercase substrings identifying the bank in text
    aliases: dict[str, tuple[str, ...]]  # tolerant, used for parsing
    detect_aliases: dict[str, tuple[str, ...]]  # distinctive, used for detect()
    date_formats: tuple[str, ...] = ()
    ambiguous_dates: bool = False  # generic only: flag day/month ambiguity


class TabularBankParser:
    def __init__(self, profile: BankProfile):
        self.profile = profile
        self.bank = profile.bank

    def detect(self, raw: RawDoc) -> float:
        marker_hit = bool(raw.text) and any(
            marker in raw.text.lower() for marker in self.profile.markers
        )
        if not raw.rows:
            return 0.4 if marker_hit else 0.0
        best_ratio = 0.0
        for cells in raw.rows[:MAX_HEADER_SCAN_ROWS]:
            mapping = match_headers(cells, self.profile.detect_aliases)
            if not (
                "date" in mapping and "desc" in mapping and _has_direction(mapping)
            ):
                continue
            ratio = len(mapping) / len(self.profile.detect_aliases)
            best_ratio = max(best_ratio, ratio)
        score = 0.7 * best_ratio + (0.3 if marker_hit else 0.0)
        return min(score, 1.0)

    def parse(self, raw: RawDoc) -> ParseOutcome:
        return parse_tabular(raw, self.profile)


def parse_tabular(raw: RawDoc, profile: BankProfile) -> ParseOutcome:
    if not raw.rows:
        return ParseOutcome([], ["no tabular data found in file"])

    header_idx, mapping = find_header(raw.rows, profile.aliases)
    if header_idx is None or mapping is None:
        return ParseOutcome([], ["could not locate a statement header row"])

    return _parse_data_rows(raw.rows[header_idx + 1 :], mapping, profile, raw.rows[header_idx])


def _parse_data_rows(
    data_rows: list[list[str]],
    mapping: dict[str, int],
    profile: BankProfile,
    header_cells: list[str] | None = None,
) -> ParseOutcome:
    header_sig = (
        [_norm_header(cell) for cell in header_cells] if header_cells else None
    )
    rows: list[ParsedRow] = []
    artifacts = dropped_no_date = dropped_no_amount = 0

    for cells in data_rows:
        if not any(cell.strip() for cell in cells):
            continue
        if header_sig and [_norm_header(cell) for cell in cells] == header_sig:
            artifacts += 1  # repeated page header in pdf statements
            continue

        parsed, missing = _parse_cells(cells, mapping, profile)
        if parsed is None:
            if missing == "artifact":
                artifacts += 1
            elif missing == "date":
                dropped_no_date += 1
            elif missing == "amount":
                dropped_no_amount += 1
            continue
        rows.append(parsed)

    warnings: list[str] = []
    dropped = dropped_no_date + dropped_no_amount
    if dropped:
        warnings.append(
            f"{dropped} row(s) skipped: no parseable date or amount"
        )
    if artifacts:
        warnings.append(f"{artifacts} header/footer artifact row(s) skipped")

    flag_balance_chain(rows)
    return ParseOutcome(rows, warnings)


def _parse_cells(
    cells: list[str], mapping: dict[str, int], profile: BankProfile
) -> tuple[ParsedRow | None, str | None]:
    def get(field_name: str) -> str:
        idx = mapping.get(field_name)
        if idx is None or idx >= len(cells):
            return ""
        return cells[idx]

    description = clean_description(get("desc"))
    # junk rows don't always carry text in the narration column (e.g. a
    # TOTAL row leads with the label in the date column) — check the first
    # non-empty cell too
    artifact_text = description or next(
        (clean_description(cell) for cell in cells if cell.strip()), ""
    )
    if is_strong_artifact(artifact_text):
        return None, "artifact"

    parsed_date: date | None = None
    ambiguous = False
    if profile.ambiguous_dates:
        numeric = parse_numeric_date(get("date"))
        if numeric:
            parsed_date, ambiguous = numeric
    if parsed_date is None:
        parsed_date = parse_date(get("date"), profile.date_formats)
    if parsed_date is None:
        return None, "date"

    amount, txn_type = _resolve_amount(get, mapping)
    if amount is None:
        return None, "amount"

    balance: float | None = None
    if "balance" in mapping:
        parsed_balance = parse_amount(get("balance"))
        if parsed_balance:
            balance = apply_hint(*parsed_balance)

    reference = _clean_reference(get("ref")) if "ref" in mapping else None
    if reference is None:
        reference = extract_reference(description)

    flags: list[str] = []
    if ambiguous:
        flags.append(BAD_DATE)
    if amount == 0:
        flags.append(ZERO_AMOUNT)
    if not description:
        flags.append(EMPTY_DESCRIPTION)
    if is_weak_artifact(description):
        flags.append(POSSIBLE_ARTIFACT)

    return (
        ParsedRow(
            date=parsed_date,
            description=description,
            amount=amount,
            type=txn_type,
            balance=balance,
            reference=reference,
            flags=flags,
        ),
        None,
    )


def _resolve_amount(
    get, mapping: dict[str, int]
) -> tuple[float | None, str]:
    """Signed amount + type from either a Dr/Cr column pair or a single
    signed amount column. Zero amounts are returned as 0.0 (flagged by the
    caller); only fully missing/unparseable amounts yield None."""
    if "debit" in mapping or "credit" in mapping:
        debit = parse_amount(get("debit"))
        credit = parse_amount(get("credit"))
        debit_v = abs(debit[0]) if debit else None
        credit_v = abs(credit[0]) if credit else None
        if debit_v:
            return -debit_v, "debit"
        if credit_v:
            return credit_v, "credit"
        if debit_v is not None:
            return 0.0, "debit"
        if credit_v is not None:
            return 0.0, "credit"
        return None, "debit"

    parsed = parse_amount(get("amount"))
    if parsed is None:
        return None, "debit"
    value = apply_hint(*parsed)
    return value, ("credit" if value >= 0 else "debit")


_REF_JUNK = {"", "-", "–", "--", "n/a", "na", "nil", "."}


def _clean_reference(text: str) -> str | None:
    ref = clean_description(text)
    return None if ref.lower() in _REF_JUNK else ref
