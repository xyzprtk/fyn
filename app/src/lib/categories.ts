/**
 * Categories are a fixed list (not a table) — rules in the category_rules
 * table map keywords onto these. Keep this list stable; analytics group by it.
 */
export const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Rent",
  "Salary",
  "Transfer",
  "Health",
  "Entertainment",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const DEFAULT_CATEGORY: Category = "Other";

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
