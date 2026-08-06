import { describe, expect, it } from "vitest";

import { transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { createAccount } from "./queries";
import { listTransactions, updateTransaction } from "./transactions";

describe("transactions workspace", () => {
  it("filters, paginates, and marks inline edits", () => {
    const db = createTestDb();
    const account = createAccount(db, { name: "Workspace account", bank: "generic" });
    db.insert(transactions).values([
      {
        accountId: account.id,
        date: new Date("2026-06-03T00:00:00Z"),
        description: "UPI-SWIGGY",
        amount: -450,
        type: "debit",
        category: "Food",
        hash: "workspace-1",
      },
      {
        accountId: account.id,
        date: new Date("2026-06-04T00:00:00Z"),
        description: "SALARY",
        amount: 5000,
        type: "credit",
        category: "Salary",
        hash: "workspace-2",
      },
    ]).run();

    const filtered = listTransactions(db, { accountId: account.id, category: "Food" });
    expect(filtered.total).toBe(1);
    expect(filtered.rows[0].description).toBe("UPI-SWIGGY");

    const updated = updateTransaction(db, {
      id: filtered.rows[0].id,
      description: "UPI-SWIGGY corrected",
      amount: -425,
      category: "Shopping",
    });
    expect(updated).toMatchObject({ description: "UPI-SWIGGY corrected", amount: -425, type: "debit", category: "Shopping", edited: true });
  });
});
