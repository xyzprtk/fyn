import { and, count, desc, eq, gte, like, lt } from "drizzle-orm";

import type { DB } from "@/db/client";
import { accounts, categoryRules, transactions } from "@/db/schema";
import { isCategory } from "@/lib/categories";
import type { TransactionFilters, TransactionListResponse, TransactionListRow } from "@/lib/transaction-types";

const PAGE_SIZE = 50;

function day(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("invalid_date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("invalid_date");
  }
  return date;
}

function conditionsFor(filters: TransactionFilters) {
  const conditions = [];
  if (filters.accountId !== undefined) conditions.push(eq(transactions.accountId, filters.accountId));
  if (filters.category) conditions.push(eq(transactions.category, filters.category));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.search) conditions.push(like(transactions.description, `%${filters.search}%`));
  if (filters.from) conditions.push(gte(transactions.date, day(filters.from)));
  if (filters.to) {
    const to = day(filters.to);
    to.setUTCDate(to.getUTCDate() + 1);
    conditions.push(lt(transactions.date, to));
  }
  return conditions;
}

function toRow(value: {
  transaction: typeof transactions.$inferSelect;
  accountName: string;
}): TransactionListRow {
  return {
    id: value.transaction.id,
    accountId: value.transaction.accountId,
    accountName: value.accountName,
    date: value.transaction.date.toISOString(),
    description: value.transaction.description,
    amount: value.transaction.amount,
    type: value.transaction.type,
    balance: value.transaction.balance,
    category: value.transaction.category,
    reference: value.transaction.reference,
    edited: value.transaction.edited,
  };
}

export function listTransactions(db: DB, filters: TransactionFilters = {}): TransactionListResponse {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const conditions = conditionsFor(filters);
  const where = conditions.length ? and(...conditions) : undefined;
  const total = db.select({ count: count() }).from(transactions).where(where).get()?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const query = db
    .select({ transaction: transactions, accountName: accounts.name })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);
  const rows = (where ? query.where(where) : query).all().map(toRow);
  return { rows, page: safePage, pageSize: PAGE_SIZE, total, pages };
}

export type TransactionPatch = {
  id: number;
  description?: string;
  amount?: number;
  category?: string;
};

export function updateTransaction(db: DB, patch: TransactionPatch): TransactionListRow | undefined {
  const current = db.select().from(transactions).where(eq(transactions.id, patch.id)).get();
  if (!current) return undefined;
  const amount = patch.amount ?? current.amount;
  const type = amount < 0 ? "debit" : "credit";
  const updated = db
    .update(transactions)
    .set({
      ...(patch.description === undefined ? {} : { description: patch.description }),
      ...(patch.amount === undefined ? {} : { amount, type }),
      ...(patch.category === undefined ? {} : { category: patch.category }),
      edited: true,
      updatedAt: new Date(),
    })
    .where(eq(transactions.id, patch.id))
    .returning()
    .get();
  if (!updated) return undefined;
  const account = db.select({ name: accounts.name }).from(accounts).where(eq(accounts.id, updated.accountId)).get();
  return account ? toRow({ transaction: updated, accountName: account.name }) : undefined;
}

export function saveCategoryRule(
  db: DB,
  keyword: string,
  category: string,
  priority = 0,
): typeof categoryRules.$inferSelect {
  return db
    .insert(categoryRules)
    .values({ keyword, category, priority })
    .onConflictDoUpdate({
      target: categoryRules.keyword,
      set: { category, priority },
    })
    .returning()
    .get();
}

export { PAGE_SIZE };
export { isCategory };
