import { and, eq, gte, lt } from "drizzle-orm";

import type { DB } from "@/db/client";
import { transactions } from "@/db/schema";
import { fynScore } from "@/lib/fyn-score";
import type { StatsFilters, StatsResponse } from "@/lib/stats-types";

type StatRow = {
  date: Date;
  amount: number;
  type: "debit" | "credit";
  category: string;
  description: string;
};

function parseDay(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("invalid_date");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("invalid_date");
  }
  return date;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function monthEndExclusive(date: Date): Date {
  return addMonths(monthStart(date), 1);
}

function normalizedMerchant(description: string): string {
  return description.trim().replace(/\s+/g, " ") || "(no description)";
}

function selectedPeriod(rows: StatRow[], filters: StatsFilters): { from: Date | null; to: Date | null } {
  const from = filters.from ? parseDay(filters.from) : null;
  const to = filters.to ? parseDay(filters.to) : null;
  if (from || to) return { from, to };
  if (rows.length === 0) return { from: null, to: null };

  const dates = rows.map((row) => row.date.getTime());
  return { from: new Date(Math.min(...dates)), to: new Date(Math.max(...dates)) };
}

export function getStats(db: DB, filters: StatsFilters = {}): StatsResponse {
  const conditions = [];
  if (filters.from) conditions.push(gte(transactions.date, parseDay(filters.from)));
  if (filters.to) conditions.push(lt(transactions.date, addDays(parseDay(filters.to), 1)));
  if (filters.accountId !== undefined) conditions.push(eq(transactions.accountId, filters.accountId));

  const query = db
    .select({
      date: transactions.date,
      amount: transactions.amount,
      type: transactions.type,
      category: transactions.category,
      description: transactions.description,
    })
    .from(transactions);
  const rows = (conditions.length ? query.where(and(...conditions)) : query).all() as StatRow[];
  const period = selectedPeriod(rows, filters);

  let income = 0;
  let spend = 0;
  let spentThisMonth = 0;
  const now = new Date();
  const currentMonthStart = monthStart(now);
  const currentMonthEnd = monthEndExclusive(now);
  const categoryTotals = new Map<string, number>();
  const merchantTotals = new Map<string, { description: string; total: number; count: number }>();
  const dailyTotals = new Map<string, { spend: number; income: number }>();
  const monthlyTotals = new Map<string, { spend: number; income: number }>();

  for (const row of rows) {
    const credit = row.type === "credit" ? Math.max(row.amount, 0) : 0;
    const debit = row.type === "debit" ? Math.abs(row.amount) : 0;
    income += credit;
    spend += debit;
    if (debit > 0 && row.date >= currentMonthStart && row.date < currentMonthEnd) {
      spentThisMonth += debit;
    }

    const day = dailyTotals.get(dayKey(row.date)) ?? { spend: 0, income: 0 };
    day.spend += debit;
    day.income += credit;
    dailyTotals.set(dayKey(row.date), day);

    const month = monthlyTotals.get(monthKey(row.date)) ?? { spend: 0, income: 0 };
    month.spend += debit;
    month.income += credit;
    monthlyTotals.set(monthKey(row.date), month);

    if (debit > 0) {
      categoryTotals.set(row.category, (categoryTotals.get(row.category) ?? 0) + debit);
      const merchant = normalizedMerchant(row.description).toLocaleLowerCase();
      const existing = merchantTotals.get(merchant) ?? {
        description: normalizedMerchant(row.description),
        total: 0,
        count: 0,
      };
      existing.total += debit;
      existing.count += 1;
      merchantTotals.set(merchant, existing);
    }
  }

  const periodFrom = period.from;
  const periodTo = period.to;
  const spanDays = periodFrom && periodTo
    ? Math.floor((periodTo.getTime() - periodFrom.getTime()) / 86_400_000) + 1
    : 0;
  const spendOverTime = spanDays > 92
    ? [...monthlyTotals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values }))
    : [...dailyTotals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values }));

  return {
    period: {
      from: periodFrom ? dayKey(periodFrom) : null,
      to: periodTo ? dayKey(periodTo) : null,
    },
    summary: {
      income,
      spend,
      net: income - spend,
      spentThisMonth,
    },
    fyn: fynScore(income, spend),
    spendOverTime,
    incomeVsSpendMonthly: [...monthlyTotals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, values]) => ({ month, ...values })),
    byCategory: [...categoryTotals.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([category, total]) => ({ category, total })),
    topMerchants: [...merchantTotals.values()].sort((a, b) => b.total - a.total).slice(0, 10),
  };
}
