import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { categoryRules, imports, transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { createAccount } from "./queries";
import { commitImport, type ImportInput } from "./imports";

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixtureRoot(uploadId: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fyn-import-"));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, ".tmp"), { recursive: true });
  fs.writeFileSync(path.join(root, ".tmp", `${uploadId}.csv`), "statement fixture");
  return root;
}

function importInput(accountId: number, uploadId: string): ImportInput {
  return {
    accountId,
    uploadId,
    originalFilename: "june.csv",
    period: { from: "2026-06-03", to: "2026-06-03" },
    rows: [
      {
        date: "2026-06-03",
        description: "UPI-SWIGGY 123456",
        amount: -450,
        type: "debit",
        balance: 12340.5,
      },
    ],
  };
}

describe("commitImport", () => {
  it("saves rows, auto-categorizes, persists the raw file, and records the import", () => {
    const db = createTestDb();
    const account = createAccount(db, { name: "Federal Savings", bank: "federal" });
    db.insert(categoryRules)
      .values({ keyword: "swiggy", category: "Food", priority: 10 })
      .run();
    const uploadId = randomUUID();
    const root = fixtureRoot(uploadId);

    const result = commitImport(db, importInput(account.id, uploadId), { uploadRoot: root });
    const saved = db.select().from(transactions).where(eq(transactions.accountId, account.id)).all();
    const history = db.select().from(imports).where(eq(imports.accountId, account.id)).all();

    expect(result).toMatchObject({
      filename: "Statement_Jun2026",
      storedPath: "data/uploads/2026-06/Statement_Jun2026.csv",
      rowsNew: 1,
      rowsDupes: 0,
    });
    expect(fs.existsSync(path.join(root, "2026-06", "Statement_Jun2026.csv"))).toBe(true);
    expect(saved[0]).toMatchObject({ amount: -450, category: "Food", type: "debit" });
    expect(history[0]).toMatchObject({ rowsNew: 1, rowsDupes: 0, originalFilename: "june.csv" });
  });

  it("skips duplicate rows and suffixes a same-month file", () => {
    const db = createTestDb();
    const account = createAccount(db, { name: "Federal Savings", bank: "federal" });
    const firstId = randomUUID();
    const firstRoot = fixtureRoot(firstId);
    const first = commitImport(db, importInput(account.id, firstId), { uploadRoot: firstRoot });

    const secondId = randomUUID();
    const secondRoot = fixtureRoot(secondId);
    const second = commitImport(db, importInput(account.id, secondId), { uploadRoot: secondRoot });

    expect(first.storedPath).toBe("data/uploads/2026-06/Statement_Jun2026.csv");
    expect(second).toMatchObject({
      storedPath: "data/uploads/2026-06/Statement_Jun2026_2.csv",
      rowsNew: 0,
      rowsDupes: 1,
    });
    expect(db.select().from(transactions).where(eq(transactions.accountId, account.id)).all()).toHaveLength(1);
    expect(db.select().from(imports).where(eq(imports.accountId, account.id)).all()).toHaveLength(2);
  });
});
