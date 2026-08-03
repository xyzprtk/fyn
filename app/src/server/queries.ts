import { asc, desc, eq } from "drizzle-orm";

import type { DB } from "@/db/client";
import { accounts, imports, transactions } from "@/db/schema";
import type { BankKey } from "@/lib/banks";

export type Account = typeof accounts.$inferSelect;
export type RecentTransaction = {
  transaction: typeof transactions.$inferSelect;
  accountName: string;
};

export type AccountInput = {
  name: string;
  bank: BankKey;
  accountNumber?: string | null;
  currency?: string;
};

export function listAccounts(db: DB): Account[] {
  return db
    .select()
    .from(accounts)
    .orderBy(asc(accounts.createdAt), asc(accounts.id))
    .all();
}

export function getAccount(db: DB, id: number): Account | undefined {
  return db.select().from(accounts).where(eq(accounts.id, id)).get();
}

export function createAccount(db: DB, input: AccountInput): Account {
  return db
    .insert(accounts)
    .values({
      name: input.name,
      bank: input.bank,
      accountNumber: input.accountNumber ?? null,
      currency: input.currency ?? "INR",
    })
    .returning()
    .get();
}

export function updateAccount(
  db: DB,
  id: number,
  patch: Partial<AccountInput>,
): Account | undefined {
  return db
    .update(accounts)
    .set(patch)
    .where(eq(accounts.id, id))
    .returning()
    .get();
}

/**
 * Deletes an account together with its transactions and import history.
 * Done manually (no ON DELETE CASCADE in the schema) so the data loss is
 * an explicit choice made here, not a hidden database behaviour.
 */
export function deleteAccount(db: DB, id: number): Account | undefined {
  return db.transaction((tx) => {
    tx.delete(transactions).where(eq(transactions.accountId, id)).run();
    tx.delete(imports).where(eq(imports.accountId, id)).run();
    return tx.delete(accounts).where(eq(accounts.id, id)).returning().get();
  });
}

export function listRecentTransactions(db: DB, limit = 50): RecentTransaction[] {
  return db
    .select({ transaction: transactions, accountName: accounts.name })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit)
    .all();
}
