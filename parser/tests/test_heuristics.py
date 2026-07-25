"""Unit tests for heuristics (flags, artifacts, cleanup, references) and
the base engine's amount/date parsing."""

from datetime import date

import pytest

from heuristics import (
    BALANCE_MISMATCH,
    clean_description,
    extract_reference,
    flag_balance_chain,
    is_strong_artifact,
    is_weak_artifact,
)
from models import ParsedRow
from parsers.base import apply_hint, parse_amount, parse_date, parse_numeric_date


def row(d: date, amount: float, balance: float | None) -> ParsedRow:
    return ParsedRow(
        date=d,
        description="x",
        amount=amount,
        type="debit" if amount < 0 else "credit",
        balance=balance,
    )


class TestBalanceChain:
    def test_clean_chain_no_flags(self):
        rows = [
            row(date(2026, 6, 1), -100.0, 900.0),
            row(date(2026, 6, 2), 50.0, 950.0),
            row(date(2026, 6, 3), -25.0, 925.0),
        ]
        flag_balance_chain(rows)
        assert all(r.flags == [] for r in rows)

    def test_break_flags_the_offending_row(self):
        rows = [
            row(date(2026, 6, 1), -100.0, 900.0),
            row(date(2026, 6, 2), 50.0, 999.0),  # 900 + 50 != 999
            row(date(2026, 6, 3), -25.0, 974.0),  # chain continues from 999
        ]
        flag_balance_chain(rows)
        assert rows[1].flags == [BALANCE_MISMATCH]
        assert rows[2].flags == []

    def test_newest_first_statement_order(self):
        rows = [
            row(date(2026, 6, 3), -25.0, 925.0),
            row(date(2026, 6, 2), 50.0, 950.0),
            row(date(2026, 6, 1), -100.0, 900.0),
        ]
        flag_balance_chain(rows)
        assert all(r.flags == [] for r in rows)

    def test_gap_in_balance_column_breaks_chain(self):
        rows = [
            row(date(2026, 6, 1), -100.0, 900.0),
            row(date(2026, 6, 2), 50.0, None),
            # would match 900 + (-25) but the gap resets the chain
            row(date(2026, 6, 3), -25.0, 875.0),
        ]
        flag_balance_chain(rows)
        assert all(r.flags == [] for r in rows)


class TestArtifacts:
    @pytest.mark.parametrize(
        "text",
        [
            "Page 1 of 3",
            "2 of 4",
            "OPENING BALANCE",
            "Closing Balance",
            "TOTAL",
            "Grand Total",
            "End of Statement",
            "This is a system-generated statement",
            "IFSC: SBIN0001234",
            "Generated on 01-07-2026",
            "Statement Period: 01-06-2026 to 30-06-2026",
        ],
    )
    def test_strong_artifacts(self, text):
        assert is_strong_artifact(text)

    @pytest.mark.parametrize(
        "text",
        [
            "UPI-SWIGGY BANGALORE",
            "TOTALITY SERVICES PVT LTD",  # real merchant containing "total"
            "Salary credit",
            "Opening hours cafe",  # "opening" alone is not an artifact
        ],
    )
    def test_real_narrations_are_not_artifacts(self, text):
        assert not is_strong_artifact(text)

    def test_weak_artifacts(self):
        assert is_weak_artifact("Brought Forward")
        assert is_weak_artifact("c/f")
        assert not is_weak_artifact("Forward trader mart")


class TestTextHelpers:
    def test_clean_description_collapses_whitespace(self):
        assert clean_description("UPI-SWIGGY\n  BANGALORE   EAST") == "UPI-SWIGGY BANGALORE EAST"
        assert clean_description("") == ""
        assert clean_description(None) == ""

    def test_extract_reference(self):
        assert extract_reference("UPI-SWIGGY-UTR123456789012") == "UTR123456789012"
        assert extract_reference("NEFT12345678 SALARY") == "NEFT12345678"
        assert extract_reference("POS 123456789012 STORE") == "123456789012"
        assert extract_reference("random text") is None


class TestParseAmount:
    def test_indian_grouping(self):
        assert parse_amount("1,23,456.00") == (123456.0, None)

    def test_plain_and_negative(self):
        assert parse_amount("450.00") == (450.0, None)
        assert parse_amount("-450.00") == (-450.0, None)

    def test_parentheses_negative(self):
        assert parse_amount("(1,200.00)") == (-1200.0, None)

    def test_dr_cr_suffixes(self):
        assert parse_amount("450.00 Dr") == (450.0, "dr")
        assert parse_amount("12,340.50 Cr") == (12340.5, "cr")
        assert parse_amount("450.00(Dr)") == (450.0, "dr")

    def test_currency_prefixes(self):
        assert parse_amount("₹1,234.00") == (1234.0, None)
        assert parse_amount("Rs. 1,234.00") == (1234.0, None)
        assert parse_amount("INR 500.00") == (500.0, None)

    def test_garbage(self):
        assert parse_amount("") is None
        assert parse_amount("abc") is None
        assert parse_amount("12,34,abc") is None

    def test_apply_hint(self):
        assert apply_hint(450.0, "dr") == -450.0
        assert apply_hint(-450.0, "cr") == 450.0
        assert apply_hint(-450.0, None) == -450.0


class TestParseDate:
    @pytest.mark.parametrize(
        "text,expected",
        [
            ("03-06-2026", date(2026, 6, 3)),
            ("03/06/2026", date(2026, 6, 3)),
            ("03-Jun-2026", date(2026, 6, 3)),
            ("03 Jun 2026", date(2026, 6, 3)),
            ("2026-06-03", date(2026, 6, 3)),
            ("2026-06-03 00:00:00", date(2026, 6, 3)),
            ("03-06-26", date(2026, 6, 3)),
        ],
    )
    def test_formats(self, text, expected):
        assert parse_date(text) == expected

    def test_profile_formats_take_precedence(self):
        assert parse_date("03-Jun-2026", ("%d-%b-%Y",)) == date(2026, 6, 3)

    def test_unparseable(self):
        assert parse_date("") is None
        assert parse_date("not a date") is None
        assert parse_date("32-13-2026") is None

    def test_numeric_ambiguity(self):
        # day/month both <= 12: ambiguous, dayfirst chosen
        assert parse_numeric_date("03/06/2026") == (date(2026, 6, 3), True)
        # day > 12: unambiguous
        assert parse_numeric_date("25/06/2026") == (date(2026, 6, 25), False)
        # same day and month: not ambiguous
        assert parse_numeric_date("06/06/2026") == (date(2026, 6, 6), False)
        assert parse_numeric_date("2026-06-03") is None
