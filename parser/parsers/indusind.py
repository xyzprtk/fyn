"""IndusInd Bank statement profile.

Known layouts (netbanking CSV / e-statement PDF): "Date, Particulars,
Chq/Ref No., Debit, Credit, Balance" with dd-mm-yyyy or dd-MMM-yyyy dates.
To be validated against a real redacted statement.
"""

from parsers.base import BankProfile

PROFILE = BankProfile(
    bank="indusind",
    markers=("indusind", "indb0"),
    aliases={
        "date": ("date", "transaction date", "txn date", "value date", "posting date"),
        "desc": ("particulars", "description", "narration", "transaction details", "details", "remarks"),
        "ref": ("chq ref no", "ref no", "reference number", "cheque no", "instrument no"),
        "debit": ("debit", "debit amount", "withdrawal", "withdrawal dr", "withdrawals", "dr"),
        "credit": ("credit", "credit amount", "deposit", "deposit cr", "deposits", "cr"),
        "balance": ("balance", "running balance", "closing balance", "available balance", "balance amount"),
    },
    detect_aliases={
        "date": ("date",),
        "desc": ("particulars",),
        "ref": ("chq ref no",),
        "debit": ("debit",),
        "credit": ("credit",),
    },
    date_formats=("%d-%m-%Y", "%d/%m/%Y", "%d-%b-%Y", "%d %b %Y"),
)
