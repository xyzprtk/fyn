"""Row-level quality heuristics and shared text helpers.

Flags mark rows the user should review in the staging screen. There are two
classes of statement junk:

- strong artifacts (page headers/footers, repeated column headers, opening/
  closing balance lines): dropped by parsers before rows are emitted;
- weak artifacts (page-break narration like "brought forward"): kept as
  rows with a `possible_artifact` flag so the user can decide.
"""

import re

from models import ParsedRow

BAD_DATE = "bad_date"
ZERO_AMOUNT = "zero_amount"
EMPTY_DESCRIPTION = "empty_description"
BALANCE_MISMATCH = "balance_mismatch"
POSSIBLE_ARTIFACT = "possible_artifact"

_STRONG_ARTIFACT = [
    r"^page\s+\d+(\s+of\s+\d+)?$",
    r"^\d+\s+of\s+\d+$",
    r"^(statement|account)\s+(period|summary|details|of accounts?)\b",
    r"^opening\s+balance\b",
    r"^closing\s+balance\b",
    r"^balance\s+b/f\b",
    r"^totals?\b",
    r"^grand\s+total\b",
    r"^end\s+of\s+(statement|page|report)",
    r"^this is a (system|auto)[- ]generated",
    r"^\**\s*end\s+of",
    r"^(branch|ifsc|micr|account\s+(no|number|type)|customer\s+(id|name))\s*:",
    r"^(generated|printed)\s+on\b",
    r"^registered\s+office\b",
    r"^www\.",
    r"^helpline\b",
    r"^toll\s+free\b",
]

_WEAK_ARTIFACT = [
    r"^b/f$",
    r"^c/f$",
    r"\bbrought\s+forward\b",
    r"\bcarried\s+forward\b",
]

_strong_re = [re.compile(p, re.IGNORECASE) for p in _STRONG_ARTIFACT]
_weak_re = [re.compile(p, re.IGNORECASE) for p in _WEAK_ARTIFACT]

_WS_RE = re.compile(r"\s+")

# Reference patterns, tried in order — first hit wins. Kept hyphen-free in
# the tail so "UPI-SWIGGY-UTR123..." yields the UTR, not the whole string.
_REFERENCE_PATTERNS = [
    re.compile(r"\bUTR[A-Z0-9]{6,}\b", re.IGNORECASE),
    re.compile(r"\b(?:NEFT|IMPS|RTGS)[A-Z0-9]{6,}\b", re.IGNORECASE),
    re.compile(r"\bUPI[-/][A-Z0-9]{5,}\b", re.IGNORECASE),
    re.compile(r"\b\d{12,}\b"),
]


def clean_description(text: str | None) -> str:
    if not text:
        return ""
    return _WS_RE.sub(" ", text).strip()


def is_strong_artifact(text: str) -> bool:
    t = clean_description(text)
    if not t:
        return False
    return any(p.search(t) for p in _strong_re)


def is_weak_artifact(text: str) -> bool:
    t = clean_description(text)
    if not t:
        return False
    return any(p.search(t) for p in _weak_re)


def extract_reference(description: str) -> str | None:
    """Pull a transaction reference out of a narration string."""
    for pattern in _REFERENCE_PATTERNS:
        match = pattern.search(description)
        if match:
            return match.group(0)
    return None


def flag_balance_chain(rows: list[ParsedRow]) -> None:
    """Flag rows where balance arithmetic breaks.

    Within one statement, ordered by date: prev_balance + amount should equal
    balance. Rows without a balance break the chain. Mutates rows in place.
    """
    prev: ParsedRow | None = None
    for row in sorted(rows, key=lambda row: row.date):
        if row.balance is None:
            prev = None  # gap in the balance column breaks the chain
            continue
        if (
            prev is not None
            and prev.balance is not None
            and abs(prev.balance + row.amount - row.balance) > 0.01
        ):
            if BALANCE_MISMATCH not in row.flags:
                row.flags.append(BALANCE_MISMATCH)
        prev = row
