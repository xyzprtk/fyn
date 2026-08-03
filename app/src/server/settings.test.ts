import { describe, expect, it } from "vitest";

import { categoryRules, imports } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { createAccount } from "./queries";
import { deleteCategoryRule, listCategoryRules, listImportHistory, updateCategoryRule } from "./settings";

describe("settings data", () => {
  it("lists, updates, and deletes category rules", () => {
    const db = createTestDb();
    const created = db.insert(categoryRules).values({ keyword: "coffee", category: "Food", priority: 1 }).returning().get();

    expect(listCategoryRules(db)[0]).toMatchObject({ keyword: "coffee", category: "Food" });
    expect(updateCategoryRule(db, created.id, { category: "Entertainment", priority: 3 })).toMatchObject({ category: "Entertainment", priority: 3 });
    expect(deleteCategoryRule(db, created.id)?.id).toBe(created.id);
    expect(listCategoryRules(db)).toHaveLength(0);
  });

  it("returns import history with account labels", () => {
    const db = createTestDb();
    const account = createAccount(db, { name: "History account", bank: "generic" });
    db.insert(imports).values({
      accountId: account.id,
      filename: "Statement_Jun2026",
      originalFilename: "june.csv",
      storedPath: "data/uploads/2026-06/Statement_Jun2026.csv",
      rowsNew: 4,
      rowsDupes: 1,
      periodFrom: new Date("2026-06-01T00:00:00Z"),
      periodTo: new Date("2026-06-30T00:00:00Z"),
    }).run();

    expect(listImportHistory(db)).toMatchObject([{
      filename: "Statement_Jun2026",
      accountName: "History account",
      rowsNew: 4,
      rowsDupes: 1,
      periodFrom: "2026-06-01T00:00:00.000Z",
    }]);
  });
});
