"""Generic fallback parser.

Two strategies, tried in order:
1. broad alias header matching (covers most CSV/XLSX exports);
2. positional column guessing — find the date-like, amount-like,
   balance-like and text columns by content, with day/month ambiguity
   reported as `bad_date` flags.

PDF is best-effort: it works when the extractor produced usable rows.
"""

from parsers.base import (
    BankProfile,
    ParseOutcome,
    _parse_data_rows,
    apply_hint,
    find_header,
    parse_amount,
    parse_date,
    parse_numeric_date,
    parse_tabular,
)
from models import RawDoc

_ALIASES = {
    "date": ("date", "transaction date", "txn date", "value date", "posting date", "when", "day"),
    "desc": ("description", "narration", "particulars", "details", "remarks", "memo", "payee", "merchant", "what"),
    "ref": ("reference", "reference number", "ref", "ref no", "utr", "cheque no", "transaction id"),
    "debit": ("debit", "debit amount", "withdrawal", "withdrawal dr", "paid out", "money out", "spent", "dr"),
    "credit": ("credit", "credit amount", "deposit", "deposit cr", "paid in", "money in", "received", "cr"),
    "amount": ("amount", "transaction amount", "amt", "value", "how much", "sum"),
    "balance": ("balance", "running balance", "available balance", "closing balance", "leftover"),
}

_PROFILE = BankProfile(
    bank="generic",
    markers=(),
    aliases=_ALIASES,
    detect_aliases=_ALIASES,  # unused: generic detection is a flat floor
    ambiguous_dates=True,
)

_DATE_RATE_THRESHOLD = 0.7
_NUM_RATE_THRESHOLD = 0.9


class GenericParser:
    bank = "generic"

    def detect(self, raw: RawDoc) -> float:
        return 0.3 if raw.rows else 0.0

    def parse(self, raw: RawDoc) -> ParseOutcome:
        header_idx, mapping = find_header(raw.rows, _ALIASES)
        if header_idx is not None and mapping is not None:
            return parse_tabular(raw, _PROFILE)

        mapping = _guess_columns(raw.rows)
        if mapping is None:
            return ParseOutcome(
                [],
                [
                    "could not identify date and amount columns — "
                    "this file does not look like a bank statement"
                ],
            )
        return _parse_data_rows(raw.rows, mapping, _PROFILE)


def _column_values(rows: list[list[str]], col: int) -> list[str]:
    return [row[col] for row in rows if col < len(row) and row[col].strip()]


def _guess_columns(rows: list[list[str]]) -> dict[str, int] | None:
    if not rows:
        return None
    n_cols = max(len(row) for row in rows)

    date_rates: list[float] = []
    num_rates: list[float] = []
    avg_lens: list[float] = []
    has_negative: list[bool] = []

    for col in range(n_cols):
        values = _column_values(rows, col)
        if not values:
            date_rates.append(0.0)
            num_rates.append(0.0)
            avg_lens.append(0.0)
            has_negative.append(False)
            continue
        date_hits = sum(
            1 for v in values if parse_numeric_date(v) or parse_date(v)
        )
        amounts = [parse_amount(v) for v in values]
        num_hits = sum(1 for a in amounts if a is not None)
        date_rates.append(date_hits / len(values))
        num_rates.append(num_hits / len(values))
        avg_lens.append(sum(len(v) for v in values) / len(values))
        has_negative.append(any(a is not None and apply_hint(*a) < 0 for a in amounts))

    date_col = _argmax(date_rates)
    if date_col is None or date_rates[date_col] < _DATE_RATE_THRESHOLD:
        return None

    numeric_cols = [
        col
        for col in range(n_cols)
        if col != date_col and num_rates[col] >= _NUM_RATE_THRESHOLD
    ]
    if not numeric_cols:
        return None

    mapping: dict[str, int] = {"date": date_col}
    negative_cols = [col for col in numeric_cols if has_negative[col]]
    if len(numeric_cols) == 1:
        mapping["amount"] = numeric_cols[0]
    else:
        # balances are usually all-positive; the amount column sees negatives
        amount_col = negative_cols[0] if negative_cols else numeric_cols[0]
        mapping["amount"] = amount_col
        balance_candidates = [col for col in numeric_cols if col != amount_col]
        if balance_candidates:
            mapping["balance"] = balance_candidates[-1]  # rightmost

    assigned = {date_col, *numeric_cols}
    desc_candidates = [
        col for col in range(n_cols) if col not in assigned and avg_lens[col] >= 3
    ]
    if desc_candidates:
        mapping["desc"] = max(desc_candidates, key=lambda col: avg_lens[col])
    return mapping


def _argmax(values: list[float]) -> int | None:
    if not values:
        return None
    best = max(range(len(values)), key=lambda i: values[i])
    return best if values[best] > 0 else None
