import type { Category } from "./categories";

export type StatementPeriod = {
  from: string;
  to: string;
};

export type ParsedRow = {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance: number | null;
  reference: string | null;
  flags: string[];
};

export type ParseResult = {
  bank: string;
  period: StatementPeriod | null;
  rows: ParsedRow[];
  warnings: string[];
  uploadId: string;
  originalFilename: string;
};

export type StagingRow = ParsedRow & {
  id: string;
  included: boolean;
  selected: boolean;
  category: Category | null;
};
