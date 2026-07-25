"""IndusInd Bank statement profile.

Validated against a real redacted statement (2026-07, "Indie" format): the
table is "Date, Particulars, Chq No/Ref No, Withdrawal, Deposit, Balance"
with "27 Jun 2026" style dates. Narrations are long UPI strings that wrap
across lines — pdf cell text is collapsed by clean_description. The Branch
IFSC (INDB...) anchors detection.
"""

from parsers.base import BankProfile

PROFILE = BankProfile(
    bank="indusind",
    markers=("indusind", "indb0"),
    aliases={
        "date": ("date", "transaction date", "txn date", "value date", "posting date"),
        "desc": ("particulars", "description", "narration", "transaction details", "details", "remarks"),
        "ref": ("chq no ref no", "chq ref no", "ref no", "reference number", "cheque no", "instrument no"),
        "debit": ("withdrawal", "withdrawals", "debit", "debit amount", "withdrawal dr", "dr"),
        "credit": ("deposit", "deposits", "credit", "credit amount", "deposit cr", "cr"),
        "balance": ("balance", "running balance", "closing balance", "available balance", "balance amount"),
    },
    detect_aliases={
        "date": ("date",),
        "desc": ("particulars",),
        "ref": ("chq no ref no", "chq ref no"),
        "debit": ("withdrawal",),
        "credit": ("deposit",),
    },
    date_formats=("%d %b %Y", "%d-%m-%Y", "%d/%m/%Y", "%d-%b-%Y"),
)
