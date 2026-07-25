"""Federal Bank statement profile.

Validated against a real redacted statement (2026-07): the table is
"Date, Value Date, Particulars, Tran Type, Cheque Details, Withdrawals,
Deposits, Balance, Dr/Cr" with dd/mm/yyyy dates. The trailing Dr/Cr column
marks the transaction's direction (verified via the balance chain) and is
ignored — Withdrawals/Deposits already carry it. The preamble holds the
IFSC (FDRL...) which anchors detection.
"""

from parsers.base import BankProfile

PROFILE = BankProfile(
    bank="federal",
    markers=("federal bank", "fednet", "fdrl0"),
    aliases={
        "date": ("date", "transaction date", "txn date", "tran date", "value date"),
        "desc": ("particulars", "narration", "description", "details", "remarks"),
        "ref": ("cheque details", "reference number", "reference no", "ref no", "cheque no", "chq ref no"),
        "debit": ("withdrawals", "withdrawal", "withdrawal dr", "debit", "debit amount"),
        "credit": ("deposits", "deposit", "deposit cr", "credit", "credit amount"),
        "balance": ("balance", "running balance", "closing balance", "balance amount"),
    },
    detect_aliases={
        "date": ("date",),
        "desc": ("particulars",),
        "ref": ("cheque details",),
        "debit": ("withdrawals", "withdrawal"),
        "credit": ("deposits", "deposit"),
    },
    date_formats=("%d/%m/%Y", "%d-%m-%Y", "%d-%b-%Y"),
)
