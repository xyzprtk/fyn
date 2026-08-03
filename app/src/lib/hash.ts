import { createHash } from "node:crypto";

function datePart(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Keep descriptions stable across bank export whitespace and trailing refs. */
export function normalizeDescription(description: string): string {
  return description
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s/#-]*\d+$/, "")
    .trim();
}

export function transactionHash(
  accountId: number,
  date: Date | string,
  amount: number,
  description: string,
): string {
  const source = `${accountId}|${datePart(date)}|${amount.toFixed(2)}|${normalizeDescription(description)}`;
  return createHash("sha256").update(source).digest("hex");
}
