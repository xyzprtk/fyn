import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { imports, transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import {
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  updateAccount,
} from "./queries";

function seedTransaction(db: ReturnType<typeof createTestDb>, accountId: number) {
  return db
    .insert(transactions)
    .values({
      accountId,
      date: new Date("2026-06-03T00:00:00Z"),
      description: "UPI-SWIGGY",
      amount: -450,
      type: "debit",
      hash: "test-hash-1",
    })
    .returning()
    .get();
}

describe("accounts", () => {
  it("creates an account with INR default", () => {
    const db = createTestDb();
    const account = createAccount(db, { name: "Federal Savings", bank: "federal" });

    expect(account.id).toBeGreaterThan(0);
    expect(account.currency).toBe("INR");
    expect(account.accountNumber).toBeNull();
    expect(account.createdAt).toBeInstanceOf(Date);
  });

  it("creates an account with a masked number and custom currency", () => {
    const db = createTestDb();
    const account = createAccount(db, {
      name: "Kotak 811",
      bank: "kotak",
      accountNumber: "XX1234",
      currency: "INR",
    });
    expect(account.accountNumber).toBe("XX1234");
  });

  it("lists accounts in creation order", () => {
    const db = createTestDb();
    createAccount(db, { name: "First", bank: "sbi" });
    createAccount(db, { name: "Second", bank: "indusind" });

    const names = listAccounts(db).map((account) => account.name);
    expect(names).toEqual(["First", "Second"]);
  });

  it("gets and updates an account", () => {
    const db = createTestDb();
    const created = createAccount(db, { name: "Old name", bank: "generic" });

    const updated = updateAccount(db, created.id, {
      name: "New name",
      bank: "federal",
    });
    expect(updated?.name).toBe("New name");
    expect(updated?.bank).toBe("federal");

    expect(getAccount(db, created.id)?.name).toBe("New name");
    expect(updateAccount(db, 9999, { name: "Nope" })).toBeUndefined();
  });

  it("deletes an account along with its transactions and imports", () => {
    const db = createTestDb();
    const account = createAccount(db, { name: "To delete", bank: "federal" });
    seedTransaction(db, account.id);
    db.insert(imports)
      .values({
        accountId: account.id,
        filename: "Statement_Jun2026",
        originalFilename: "june.csv",
        storedPath: "data/uploads/2026-06/Statement_Jun2026.csv",
        rowsNew: 1,
        rowsDupes: 0,
      })
      .run();

    const deleted = deleteAccount(db, account.id);
    expect(deleted?.id).toBe(account.id);
    expect(getAccount(db, account.id)).toBeUndefined();
    expect(
      db.select().from(transactions).where(eq(transactions.accountId, account.id)).all(),
    ).toHaveLength(0);
    expect(
      db.select().from(imports).where(eq(imports.accountId, account.id)).all(),
    ).toHaveLength(0);
  });

  it("leaves other accounts' transactions untouched on delete", () => {
    const db = createTestDb();
    const keep = createAccount(db, { name: "Keep", bank: "sbi" });
    const drop = createAccount(db, { name: "Drop", bank: "kotak" });
    seedTransaction(db, keep.id);
    seedTransaction(db, drop.id);

    deleteAccount(db, drop.id);

    const remaining = db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, keep.id))
      .all();
    expect(remaining).toHaveLength(1);
  });

  it("returns undefined when deleting a missing account", () => {
    const db = createTestDb();
    expect(deleteAccount(db, 9999)).toBeUndefined();
  });
});
