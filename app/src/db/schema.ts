import { sqliteTable as table } from "drizzle-orm/sqlite-core";
import * as t from "drizzle-orm/sqlite-core";

export const accounts = table("accounts", {
  id: t.int().primaryKey({ autoIncrement: true }),
  name: t.text().notNull(), // "Federal Savings", "Kotak 811"
  bank: t.text().notNull(), // 'indusind' | 'sbi' | 'federal' | 'kotak' | 'generic'
  accountNumber: t.text("account_number"), // store masked/last-4 only
  currency: t.text().notNull().default("INR"),
  createdAt: t
    .int("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const transactions = table(
  "transactions",
  {
    id: t.int().primaryKey({ autoIncrement: true }),
    accountId: t
      .int("account_id")
      .notNull()
      .references(() => accounts.id),
    date: t.int({ mode: "timestamp" }).notNull(),
    description: t.text().notNull(),
    amount: t.real().notNull(), // signed: - debit, + credit
    type: t.text({ enum: ["debit", "credit"] }).notNull(),
    balance: t.real(), // running balance, nullable
    category: t.text().notNull().default("Other"),
    reference: t.text(),
    hash: t.text().notNull(), // dedup key, see lib/hash.ts
    edited: t.int({ mode: "boolean" }).notNull().default(false),
    createdAt: t
      .int("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: t
      .int("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (tx) => [
    t.uniqueIndex("tx_hash_account_idx").on(tx.accountId, tx.hash),
    t.index("tx_account_date_idx").on(tx.accountId, tx.date),
    t.index("tx_category_idx").on(tx.category),
  ],
);

export const imports = table("imports", {
  id: t.int().primaryKey({ autoIncrement: true }),
  accountId: t
    .int("account_id")
    .notNull()
    .references(() => accounts.id),
  filename: t.text().notNull(), // canonical: "Statement_Jun2026"
  originalFilename: t.text("original_filename").notNull(),
  storedPath: t.text("stored_path").notNull(), // "data/uploads/2026-06/Statement_Jun2026.pdf"
  importedAt: t
    .int("imported_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  rowsNew: t.int("rows_new").notNull(),
  rowsDupes: t.int("rows_dupes").notNull(),
  periodFrom: t.int("period_from", { mode: "timestamp" }),
  periodTo: t.int("period_to", { mode: "timestamp" }),
});

export const categoryRules = table("category_rules", {
  id: t.int().primaryKey({ autoIncrement: true }),
  keyword: t.text().notNull().unique(), // lowercase, matched as substring
  category: t.text().notNull(),
  priority: t.int().notNull().default(0), // higher wins on conflict
});

export const settings = table("settings", {
  key: t.text().primaryKey(), // 'password_hash' | 'theme' | ...
  value: t.text().notNull(),
});

export const sessions = table("sessions", {
  token: t.text().primaryKey(), // 32-byte random hex
  createdAt: t
    .int("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: t.int("expires_at", { mode: "timestamp" }).notNull(), // +30d rolling
});
