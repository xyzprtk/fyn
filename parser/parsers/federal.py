"""Federal Bank statement profile.

Known layouts (FedNet CSV / PDF): "Transaction Date, Value Date, Narration,
Reference Number, Withdrawal, Deposit, Balance" with dd-mm-yyyy dates.
To be validated against a real redacted statement.
"""

from parsers.base import BankProfile

PROFILE = BankProfile(
    bank="federal",
    markers=("federal bank", "fednet", "fdrl0"),
    aliases={
        "date": ("transaction date", "date", "txn date", "tran date", "value date"),
        "desc": ("narration", "description", "particulars", "details", "remarks"),
        "ref": ("reference number", "reference no", "ref no", "cheque no", "chq ref no"),
        "debit": ("withdrawal", "withdrawals", "withdrawal dr", "debit", "debit amount"),
        "credit": ("deposit", "deposits", "deposit cr", "credit", "credit amount"),
        "balance": ("balance", "running balance", "closing balance", "balance amount"),
    },
    detect_aliases={
        "date": ("transaction date",),
        "desc": ("narration",),
        "ref": ("reference number",),
        "debit": ("withdrawal",),
        "credit": ("deposit",),
    },
    date_formats=("%d-%m-%Y", "%d/%m/%Y", "%d-%b-%Y"),
)
