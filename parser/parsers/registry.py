"""Parser registry: pick the right bank parser for a document.

Resolution order:
1. an explicit bank hint wins, but only if that parser detects *something*
   in the file (detect > 0) — a wrong hint falls through to detection;
2. otherwise the highest detect() score at or above the generic floor;
3. the generic parser as the always-available fallback.
"""

from models import RawDoc
from parsers import federal, indusind, kotak, sbi
from parsers.base import BankParser, TabularBankParser
from parsers.generic import GenericParser

GENERIC_FLOOR = 0.3

PARSERS: list[BankParser] = [
    TabularBankParser(indusind.PROFILE),
    TabularBankParser(sbi.PROFILE),
    TabularBankParser(federal.PROFILE),
    TabularBankParser(kotak.PROFILE),
]

_GENERIC = GenericParser()


def resolve(bank_hint: str | None, raw: RawDoc) -> BankParser:
    if bank_hint:
        hint = bank_hint.strip().lower()
        if hint == "generic":
            return _GENERIC
        for parser in PARSERS:
            if parser.bank == hint and parser.detect(raw) > 0:
                return parser
        # unknown bank name or zero-detection hint: fall through

    best = max(PARSERS, key=lambda parser: parser.detect(raw))
    if best.detect(raw) >= GENERIC_FLOOR:
        return best
    return _GENERIC
