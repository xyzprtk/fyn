"""Fixture tests: synthetic statement per bank -> exact expected rows,
plus registry resolution and the generic parser's column guessing."""

import io
from datetime import date
from pathlib import Path

import pytest
from openpyxl import Workbook

from extractors import extract
from parsers.registry import resolve

from pdfgen import make_table_pdf

FIXTURES = Path(__file__).parent / "fixtures"


def parse_fixture(name: str, hint: str | None = None):
    data = (FIXTURES / name).read_bytes()
    raw = extract("csv", data, name)
    parser = resolve(hint, raw)
    return parser.bank, parser.parse(raw)


def as_tuples(outcome):
    return [
        (r.date, r.description, r.amount, r.type, r.balance, r.reference, r.flags)
        for r in outcome.rows
    ]


class TestBankFixtures:
    def test_federal(self):
        bank, outcome = parse_fixture("federal.csv")
        assert bank == "federal"
        assert as_tuples(outcome) == [
            (date(2026, 6, 25), "UPIOUT/654240549874/q707628024@ybl/UPI/5814", -55.0, "debit", 232.80, "654240549874", []),
            (date(2026, 6, 27), "SBINT:28-03-2026 to 26-06-2026[77770111748717]", 19.0, "credit", 251.80, "77770111748717", []),
            (date(2026, 6, 27), "UPI IN/561043065223/user@ybl/Pay/0000", 2000.0, "credit", 2251.80, "561043065223", []),
            (date(2026, 6, 28), "AMAZON PAY", -1299.0, "debit", 0.0, None, ["balance_mismatch"]),
        ]
        assert outcome.warnings == ["2 header/footer artifact row(s) skipped"]

    def test_indusind(self):
        bank, outcome = parse_fixture("indusind.csv")
        assert bank == "indusind"
        assert as_tuples(outcome) == [
            (date(2026, 6, 24), "UPI/ZOMATO/ORDER", -1050.0, "debit", 48950.0, "UTR111222333", []),
            (date(2026, 6, 25), "NEFT SALARY CREDIT", 62500.0, "credit", 111450.0, "NEFT000123", []),
            (date(2026, 6, 26), "RENT TRANSFER", -26450.0, "debit", 85000.0, None, []),
            (date(2026, 6, 27), "", -100.0, "debit", 84900.0, "S63268713", ["empty_description"]),
        ]
        assert outcome.warnings == []

    def test_sbi(self):
        bank, outcome = parse_fixture("sbi.csv")
        assert bank == "sbi"
        assert as_tuples(outcome) == [
            (date(2026, 6, 1), "UPI-FLIPKART", -2499.0, "debit", 73501.0, "UTR999888777", []),
            (date(2026, 6, 3), "IRCTC TICKET", -1845.5, "debit", 71655.5, "UTR111000111", []),
            (date(2026, 6, 5), "SALARY CREDIT", 95000.0, "credit", 166655.5, None, []),
            (date(2026, 6, 6), "ATM CASH WDL", -10000.0, "debit", 156655.5, "ATM123456", []),
        ]
        assert outcome.warnings == []

    def test_kotak(self):
        bank, outcome = parse_fixture("kotak.csv")
        assert bank == "kotak"
        assert as_tuples(outcome) == [
            (date(2026, 6, 1), "UPI-SWIGGY", -450.0, "debit", 52100.0, "UTR333444555", []),
            (date(2026, 6, 3), "SALARY CREDIT", 120000.0, "credit", 172100.0, "UTR222111000", []),
            (date(2026, 6, 4), "NETFLIX SUB", -649.0, "debit", 171451.0, "UTR888999000", []),
            (date(2026, 6, 5), "REVERSAL CHARGES", 0.0, "debit", 171451.0, "UTR777666555", ["zero_amount"]),
        ]
        assert outcome.warnings == []

    def test_generic_aliases_with_ambiguous_date(self):
        bank, outcome = parse_fixture("generic.csv", hint="generic")
        assert bank == "generic"
        assert as_tuples(outcome) == [
            (date(2026, 6, 1), "Grocery store", -1250.75, "debit", 48749.25, None, []),
            (date(2026, 6, 2), "Salary from Acme", 75000.0, "credit", 123749.25, None, []),
            (date(2026, 6, 3), "Coffee shop", -300.0, "debit", 123449.25, None, ["bad_date"]),
        ]


class TestRegistry:
    @pytest.mark.parametrize(
        "name,expected",
        [
            ("federal.csv", "federal"),
            ("indusind.csv", "indusind"),
            ("sbi.csv", "sbi"),
            ("kotak.csv", "kotak"),
        ],
    )
    def test_detection_without_hint(self, name, expected):
        bank, _ = parse_fixture(name)
        assert bank == expected

    def test_matching_hint_wins(self):
        bank, _ = parse_fixture("federal.csv", hint="federal")
        assert bank == "federal"

    def test_wrong_hint_falls_back_to_detection(self):
        # sbi detects nothing in a kotak file -> hint ignored
        bank, _ = parse_fixture("kotak.csv", hint="sbi")
        assert bank == "kotak"

    def test_generic_hint_forces_generic(self):
        bank, _ = parse_fixture("federal.csv", hint="generic")
        assert bank == "generic"

    def test_unknown_hint_is_ignored(self):
        bank, _ = parse_fixture("sbi.csv", hint="hdfc")
        assert bank == "sbi"

    def test_garbage_falls_through_to_generic(self):
        raw = extract("csv", b"a,b,c\n1,2,3\n4,5,6\n", "junk.csv")
        parser = resolve(None, raw)
        assert parser.bank == "generic"
        outcome = parser.parse(raw)
        assert outcome.rows == []
        assert outcome.warnings != []


class TestGenericPositional:
    def test_guesses_columns_without_a_header(self):
        data = (
            b"2026-06-01,Salary from Acme,75000,123749.25\n"
            b"2026-06-02,Grocery store,-1250.75,122498.50\n"
        )
        raw = extract("csv", data, "plain.csv")
        parser = resolve("generic", raw)
        outcome = parser.parse(raw)
        assert as_tuples(outcome) == [
            (date(2026, 6, 1), "Salary from Acme", 75000.0, "credit", 123749.25, None, []),
            (date(2026, 6, 2), "Grocery store", -1250.75, "debit", 122498.50, None, []),
        ]


class TestXlsx:
    def test_sbi_xlsx(self):
        rows = [
            ["Txn Date", "Value Date", "Description", "Ref No./Cheque No.", "Debit", "Credit", "Balance"],
            ["01-Jun-2026", "01-Jun-2026", "UPI-FLIPKART", "UTR999888777", "2,499.00", "", "73,501.00"],
            ["03-Jun-2026", "03-Jun-2026", "IRCTC TICKET", "UTR111000111", "1,845.50", "", "71,655.50"],
        ]
        workbook = Workbook()
        sheet = workbook.active
        for row in rows:
            sheet.append(row)
        buffer = io.BytesIO()
        workbook.save(buffer)

        raw = extract("xlsx", buffer.getvalue(), "sbi.xlsx")
        parser = resolve("sbi", raw)
        outcome = parser.parse(raw)
        assert parser.bank == "sbi"
        assert [r.amount for r in outcome.rows] == [-2499.0, -1845.5]
        assert outcome.rows[0].date == date(2026, 6, 1)


class TestPdf:
    def test_federal_pdf(self):
        pdf_bytes = make_table_pdf(
            [
                ["Date", "Value Date", "Particulars", "Tran Type", "Cheque Details", "Withdrawals", "Deposits", "Balance", "Dr/Cr"],
                ["25/06/2026", "25/06/2026", "UPIOUT/65424054", "TFR", "UTR123456", "55.00", "", "232.80", "Dr"],
                ["27/06/2026", "27/06/2026", "UPI IN/56104306", "TFR", "", "", "2,000.00", "2,232.80", "Cr"],
            ],
            title="Federal Bank - IFSC: FDRL0007777",
        )
        raw = extract("pdf", pdf_bytes, "federal.pdf")
        parser = resolve(None, raw)
        assert parser.bank == "federal"
        outcome = parser.parse(raw)
        assert as_tuples(outcome) == [
            (date(2026, 6, 25), "UPIOUT/65424054", -55.0, "debit", 232.80, "UTR123456", []),
            (date(2026, 6, 27), "UPI IN/56104306", 2000.0, "credit", 2232.80, None, []),
        ]
