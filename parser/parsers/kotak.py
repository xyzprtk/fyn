"""Kotak Mahindra Bank statement profile.

Known layouts (811/netbanking CSV, PDF): "Date, Narration, Chq/Ref No.,
Withdrawal (Dr), Deposit (Cr), Balance" — amounts and balances may carry
Dr/Cr suffixes, handled by the shared amount parser. Best-effort until
validated against a real statement.
"""

from parsers.base import BankProfile

PROFILE = BankProfile(
    bank="kotak",
    markers=("kotak mahindra", "kotak", "kkbk0"),
    aliases={
        "date": ("date", "transaction date", "txn date", "value date"),
        "desc": ("narration", "description", "particulars", "details"),
        "ref": ("chq ref no", "ref no", "reference number", "cheque no"),
        "debit": ("withdrawal dr", "withdrawal", "debit", "debit amount", "dr"),
        "credit": ("deposit cr", "deposit", "credit", "credit amount", "cr"),
        "balance": ("balance", "balance dr cr", "running balance", "closing balance"),
    },
    detect_aliases={
        "date": ("date",),
        "desc": ("narration",),
        "debit": ("withdrawal dr",),
        "credit": ("deposit cr",),
        "ref": ("chq ref no",),
    },
    date_formats=("%d-%m-%Y", "%d/%m/%Y", "%d-%b-%Y"),
)
