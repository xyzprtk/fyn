"""State Bank of India statement profile.

Known layouts (YONO/netbanking CSV, XLSX): "Txn Date, Value Date,
Description, Ref No./Cheque No., Debit, Credit, Balance" with dd-MMM-yyyy
dates. Best-effort until validated against a real statement.
"""

from parsers.base import BankProfile

PROFILE = BankProfile(
    bank="sbi",
    markers=("state bank of india", "sbin0"),
    aliases={
        "date": ("txn date", "transaction date", "date", "value date"),
        "desc": ("description", "narration", "particulars", "details"),
        "ref": ("ref no cheque no", "ref no", "cheque no", "ref number", "reference number"),
        "debit": ("debit", "debit amount", "withdrawal", "withdrawal dr", "dr"),
        "credit": ("credit", "credit amount", "deposit", "deposit cr", "cr"),
        "balance": ("balance", "running balance", "available balance"),
    },
    detect_aliases={
        "date": ("txn date",),
        "desc": ("description",),
        "ref": ("ref no cheque no",),
        "debit": ("debit",),
        "credit": ("credit",),
    },
    date_formats=("%d-%b-%Y", "%d %b %Y", "%d-%m-%Y", "%d/%m/%Y"),
)
