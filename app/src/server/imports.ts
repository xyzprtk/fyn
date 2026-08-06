import fs from "node:fs";
import path from "node:path";

import { asc, desc, eq } from "drizzle-orm";

import type { DB } from "@/db/client";
import { categoryRules, imports, transactions } from "@/db/schema";
import { isCategory, type Category, DEFAULT_CATEGORY } from "@/lib/categories";
import { transactionHash } from "@/lib/hash";
import type { StatementPeriod } from "@/lib/import-types";
import { getAccount } from "./queries";

const UPLOAD_ID_PATTERN = /^[0-9a-f-]{36}$/i;
const ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".pdf"]);
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type ImportRowInput = {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance?: number | null;
  reference?: string | null;
  category?: string | null;
};

export type ImportInput = {
  accountId: number;
  uploadId: string;
  originalFilename: string;
  period: StatementPeriod | null;
  rows: ImportRowInput[];
};

export type ImportResult = {
  filename: string;
  storedPath: string;
  rowsNew: number;
  rowsDupes: number;
  period: StatementPeriod;
};

export class ImportValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

function repoDataPath(): string {
  return path.resolve(process.cwd(), "..", "data");
}

export function uploadRootPath(): string {
  return path.join(repoDataPath(), "uploads");
}

function parseDate(value: unknown): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ImportValidationError("invalid_date");
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ImportValidationError("invalid_date");
  }
  return date;
}

function dateText(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parsePeriod(period: StatementPeriod | null): StatementPeriod | null {
  if (!period) return null;
  const from = parseDate(period.from);
  const to = parseDate(period.to);
  if (from.getTime() > to.getTime()) {
    throw new ImportValidationError("invalid_period");
  }
  return { from: dateText(from), to: dateText(to) };
}

function normalizeRows(input: ImportInput): {
  rows: Array<{
    date: Date;
    description: string;
    amount: number;
    type: "debit" | "credit";
    balance: number | null;
    reference: string | null;
    category: Category;
    hash: string;
  }>;
  period: StatementPeriod;
} {
  if (!Array.isArray(input.rows) || input.rows.length === 0) {
    throw new ImportValidationError("no_rows");
  }
  if (input.rows.length > 5000) {
    throw new ImportValidationError("too_many_rows");
  }

  const period = parsePeriod(input.period);
  const rows = input.rows.map((row) => {
    const date = parseDate(row.date);
    if (typeof row.description !== "string" || row.description.length > 2000) {
      throw new ImportValidationError("invalid_description");
    }
    if (typeof row.amount !== "number" || !Number.isFinite(row.amount)) {
      throw new ImportValidationError("invalid_amount");
    }
    if (row.type !== "debit" && row.type !== "credit") {
      throw new ImportValidationError("invalid_type");
    }
    if (
      row.balance !== null &&
      row.balance !== undefined &&
      (typeof row.balance !== "number" || !Number.isFinite(row.balance))
    ) {
      throw new ImportValidationError("invalid_balance");
    }
    if (row.reference !== null && row.reference !== undefined && typeof row.reference !== "string") {
      throw new ImportValidationError("invalid_reference");
    }
    if (row.category !== null && row.category !== undefined && !isCategory(row.category)) {
      throw new ImportValidationError("invalid_category");
    }

    const amount = Math.abs(row.amount) * (row.type === "debit" ? -1 : 1);
    return {
      date,
      description: row.description.trim(),
      amount,
      type: row.type,
      balance: row.balance ?? null,
      reference: row.reference?.trim() || null,
      category: row.category && isCategory(row.category) ? row.category : DEFAULT_CATEGORY,
      hash: transactionHash(input.accountId, date, amount, row.description),
    };
  });

  const derivedFrom = rows.reduce((min, row) => (row.date < min ? row.date : min), rows[0].date);
  const derivedTo = rows.reduce((max, row) => (row.date > max ? row.date : max), rows[0].date);
  return {
    rows,
    period: period ?? { from: dateText(derivedFrom), to: dateText(derivedTo) },
  };
}

function categoryForDescription(
  description: string,
  rules: Array<{ keyword: string; category: string }>,
): Category {
  const lowerDescription = description.toLocaleLowerCase();
  const match = rules.find((rule) => lowerDescription.includes(rule.keyword.toLocaleLowerCase()));
  return match && isCategory(match.category) ? match.category : DEFAULT_CATEGORY;
}

function extensionFor(filename: string): string {
  const extension = path.extname(filename).toLocaleLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new ImportValidationError("unsupported_type");
  }
  return extension;
}

function safeOriginalFilename(filename: string): string {
  const safe = path.basename(filename).trim();
  if (!safe || safe.length > 255) throw new ImportValidationError("invalid_filename");
  extensionFor(safe);
  return safe;
}

function tempPath(uploadRoot: string, uploadId: string, extension: string): string {
  if (!UPLOAD_ID_PATTERN.test(uploadId)) throw new ImportValidationError("invalid_upload");
  return path.join(uploadRoot, ".tmp", `${uploadId}${extension}`);
}

function nextStoredName(
  db: DB,
  accountId: number,
  monthKey: string,
  monthLabel: string,
  extension: string,
  root: string,
): { filename: string; storedPath: string; absolutePath: string } {
  const previous = db
    .select({ storedPath: imports.storedPath })
    .from(imports)
    .where(eq(imports.accountId, accountId))
    .all();
  const previousPaths = new Set(previous.map((item) => item.storedPath));
  const directory = path.join(root, monthKey);
  const stem = `Statement_${monthLabel}`;

  for (let suffix = 1; suffix < 10000; suffix += 1) {
    const filename = `${stem}${suffix === 1 ? "" : `_${suffix}`}${extension}`;
    const storedPath = path.posix.join("data", "uploads", monthKey, filename);
    const absolutePath = path.join(directory, filename);
    if (!previousPaths.has(storedPath) && !fs.existsSync(absolutePath)) {
      return { filename: filename.slice(0, -extension.length), storedPath, absolutePath };
    }
  }
  throw new ImportValidationError("filename_collision");
}

export function commitImport(
  db: DB,
  input: ImportInput,
  options: { uploadRoot?: string } = {},
): ImportResult {
  const account = getAccount(db, input.accountId);
  if (!account) throw new ImportValidationError("account_not_found");
  const originalFilename = safeOriginalFilename(input.originalFilename);
  const extension = extensionFor(originalFilename);
  const normalized = normalizeRows(input);
  const periodFrom = parseDate(normalized.period.from);
  const periodTo = parseDate(normalized.period.to);
  const monthKey = normalized.period.to.slice(0, 7);
  const monthLabel = `${MONTH_NAMES[periodTo.getUTCMonth()]}${periodTo.getUTCFullYear()}`;
  const root = options.uploadRoot ?? uploadRootPath();
  const source = tempPath(root, input.uploadId, extension);
  if (!fs.existsSync(source)) throw new ImportValidationError("upload_expired");

  const target = nextStoredName(db, input.accountId, monthKey, monthLabel, extension, root);
  fs.mkdirSync(path.dirname(target.absolutePath), { recursive: true });
  fs.renameSync(source, target.absolutePath);

  try {
    let rowsNew = 0;
    let rowsDupes = 0;
    db.transaction((tx) => {
      const rules = tx
        .select({ keyword: categoryRules.keyword, category: categoryRules.category })
        .from(categoryRules)
        .orderBy(desc(categoryRules.priority), asc(categoryRules.id))
        .all();

      for (const row of normalized.rows) {
        const category = input.rows[normalized.rows.indexOf(row)].category
          ? row.category
          : categoryForDescription(row.description, rules);
        const result = tx
          .insert(transactions)
          .values({
            accountId: input.accountId,
            date: row.date,
            description: row.description,
            amount: row.amount,
            type: row.type,
            balance: row.balance,
            category,
            reference: row.reference,
            hash: row.hash,
          })
          .onConflictDoNothing({ target: [transactions.accountId, transactions.hash] })
          .run();
        if (result.changes > 0) rowsNew += 1;
        else rowsDupes += 1;
      }

      tx.insert(imports)
        .values({
          accountId: input.accountId,
          filename: target.filename,
          originalFilename,
          storedPath: target.storedPath,
          rowsNew,
          rowsDupes,
          periodFrom,
          periodTo,
        })
        .run();
    });

    return {
      filename: target.filename,
      storedPath: target.storedPath,
      rowsNew,
      rowsDupes,
      period: normalized.period,
    };
  } catch (error) {
    try {
      fs.renameSync(target.absolutePath, source);
    } catch {
      // Preserve the original database error; the file can be recovered manually.
    }
    throw error;
  }
}
