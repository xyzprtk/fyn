/** Supported bank statement formats. The parser service keys off these. */
export const BANKS = [
  { key: "indusind", label: "IndusInd" },
  { key: "sbi", label: "SBI" },
  { key: "federal", label: "Federal" },
  { key: "kotak", label: "Kotak" },
  { key: "generic", label: "Generic / other" },
] as const;

export type BankKey = (typeof BANKS)[number]["key"];

export const BANK_KEYS: readonly BankKey[] = BANKS.map((bank) => bank.key);

export function isBankKey(value: unknown): value is BankKey {
  return typeof value === "string" && (BANK_KEYS as readonly string[]).includes(value);
}

export function bankLabel(key: string): string {
  return BANKS.find((bank) => bank.key === key)?.label ?? key;
}
