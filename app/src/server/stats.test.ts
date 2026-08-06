import { describe, expect, it } from "vitest";

import { transactions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { fynScore } from "@/lib/fyn-score";
import { createAccount } from "./queries";
import { getStats } from "./stats";

function seed(db: ReturnType<typeof createTestDb>, accountId: number) {
  db.insert(transactions).values([
    {
      accountId,
      date: new Date("2026-06-03T00:00:00Z"),
      description: "UPI-SWIGGY",
      amount: -450,
      type: "debit",
      category: "Food",
      hash: "stats-1",
    },
    {
      accountId,
      date: new Date("2026-06-04T00:00:00Z"),
      description: "SALARY",
      amount: 5000,
      type: "credit",
      category: "Salary",
      hash: "stats-2",
    },
  ]).run();
}

describe("getStats", () => {
  it("computes summary, score, categories and merchants for a range", () => {
    const db = createTestDb();
    const account = createAccount(db, { name: "Stats account", bank: "generic" });
    seed(db, account.id);

    const result = getStats(db, {
      accountId: account.id,
      from: "2026-06-01",
      to: "2026-06-30",
    });

    expect(result.summary).toMatchObject({ income: 5000, spend: 450, net: 4550 });
    expect(result.fyn).toEqual(fynScore(5000, 450));
    expect(result.byCategory).toEqual([{ category: "Food", total: 450 }]);
    expect(result.topMerchants[0]).toMatchObject({ description: "UPI-SWIGGY", total: 450, count: 1 });
    expect(result.incomeVsSpendMonthly).toEqual([{ month: "2026-06", spend: 450, income: 5000 }]);
  });

  it("does not include rows outside the selected account and dates", () => {
    const db = createTestDb();
    const first = createAccount(db, { name: "First", bank: "generic" });
    const second = createAccount(db, { name: "Second", bank: "sbi" });
    seed(db, first.id);
    seed(db, second.id);

    const result = getStats(db, { accountId: first.id, from: "2026-06-03", to: "2026-06-03" });
    expect(result.summary).toMatchObject({ income: 0, spend: 450, net: -450 });
    expect(result.spendOverTime).toEqual([{ date: "2026-06-03", spend: 450, income: 0 }]);
  });
});
