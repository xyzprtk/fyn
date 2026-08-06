import { and, eq, gte, lt, sql, type SQL } from "drizzle-orm";

import type { DB } from "@/db/client";
import { transactions } from "@/db/schema";
import { fynScore } from "@/lib/fyn-score";
import type { StatsFilters, StatsResponse } from "@/lib/stats-types";

type AggregateRow = {
  income: number | null;
  spend: number | null;
  fromMs: number | null;
  toMs: number | null;
};

type BucketRow = {
  bucket: string;
  income: number | null;
  spend: number | null;
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

function numeric(value: number | null | undefined): number {
  return Number(value ?? 0);
}

function normalizedMerchant(description: string): string {
  return description.trim().replace(/\s+/g, " ") || "(no description)";
}

function whereFor(filters: StatsFilters, extras: SQL[] = []): SQL | undefined {
  const conditions: SQL[] = [...extras];
  if (filters.from) conditions.push(gte(transactions.date, parseDay(filters.from)));
  if (filters.to) conditions.push(lt(transactions.date, addDays(parseDay(filters.to), 1)));
  if (filters.accountId !== undefined) conditions.push(eq(transactions.accountId, filters.accountId));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

function summaryQuery(db: DB, where: SQL | undefined): AggregateRow {
  const query = db
    .select({
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'credit' and ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      spend: sql<number>`coalesce(sum(case when ${transactions.type} = 'debit' and ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
      fromMs: sql<number | null>`min(${transactions.date})`,
      toMs: sql<number | null>`max(${transactions.date})`,
    })
    .from(transactions);
  return (where ? query.where(where) : query).get() ?? { income: 0, spend: 0, fromMs: null, toMs: null };
}

function bucketQuery(db: DB, where: SQL | undefined, format: "%Y-%m-%d" | "%Y-%m"): BucketRow[] {
  const bucket = sql<string>`strftime(${format}, datetime(${transactions.date}, 'unixepoch'))`;
  const query = db
    .select({
      bucket,
      income: sql<number>`coalesce(sum(case when ${transactions.type} = 'credit' and ${transactions.amount} > 0 then ${transactions.amount} else 0 end), 0)`,
      spend: sql<number>`coalesce(sum(case when ${transactions.type} = 'debit' and ${transactions.amount} < 0 then -${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .groupBy(bucket)
    .orderBy(bucket);
  return (where ? query.where(where) : query).all();
}

function categoryQuery(db: DB, where: SQL | undefined): Array<{ category: string; total: number }> {
  const debitWhere = whereFor({}, [
    ...(where ? [where] : []),
    eq(transactions.type, "debit"),
    lt(transactions.amount, 0),
  ]);
  const query = db
    .select({
      category: transactions.category,
      total: sql<number>`sum(-${transactions.amount})`,
    })
    .from(transactions)
    .groupBy(transactions.category)
    .orderBy(sql`sum(-${transactions.amount}) desc`);
  return (debitWhere ? query.where(debitWhere) : query).all().map((row) => ({
    category: row.category,
    total: numeric(row.total),
  }));
}

function merchantQuery(db: DB, where: SQL | undefined): Array<{ description: string; total: number; count: number }> {
  const debitWhere = whereFor({}, [
    ...(where ? [where] : []),
    eq(transactions.type, "debit"),
    lt(transactions.amount, 0),
  ]);
  const merchant = sql<string>`lower(trim(${transactions.description}))`;
  const query = db
    .select({
      description: sql<string>`min(${transactions.description})`,
      total: sql<number>`sum(-${transactions.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .groupBy(merchant)
    .orderBy(sql`sum(-${transactions.amount}) desc`)
    .limit(10);
  return (debitWhere ? query.where(debitWhere) : query).all().map((row) => ({
    description: normalizedMerchant(row.description ?? ""),
    total: numeric(row.total),
    count: numeric(row.count),
  }));
}

export function getStats(db: DB, filters: StatsFilters = {}): StatsResponse {
  const where = whereFor(filters);
  const aggregate = summaryQuery(db, where);
  const income = numeric(aggregate.income);
  const spend = numeric(aggregate.spend);
  const periodFrom = filters.from
    ? parseDay(filters.from)
    : aggregate.fromMs === null
      ? null
      : new Date(Number(aggregate.fromMs) * 1000);
  const periodTo = filters.to
    ? parseDay(filters.to)
    : aggregate.toMs === null
      ? null
      : new Date(Number(aggregate.toMs) * 1000);

  const now = new Date();
  const currentMonthWhere = whereFor(filters, [
    gte(transactions.date, monthStart(now)),
    lt(transactions.date, monthEndExclusive(now)),
  ]);
  const currentMonth = summaryQuery(db, currentMonthWhere);
  const spanDays = periodFrom && periodTo
    ? Math.floor((periodTo.getTime() - periodFrom.getTime()) / 86_400_000) + 1
    : 0;
  const bucketFormat = spanDays > 92 ? "%Y-%m" : "%Y-%m-%d";
  const buckets = bucketQuery(db, where, bucketFormat);
  const monthly = spanDays > 92 ? buckets : bucketQuery(db, where, "%Y-%m");

  return {
    period: {
      from: periodFrom ? dayKey(periodFrom) : null,
      to: periodTo ? dayKey(periodTo) : null,
    },
    summary: {
      income,
      spend,
      net: income - spend,
      spentThisMonth: numeric(currentMonth.spend),
    },
    fyn: fynScore(income, spend),
    spendOverTime: buckets.map((row) => ({
      date: row.bucket,
      income: numeric(row.income),
      spend: numeric(row.spend),
    })),
    incomeVsSpendMonthly: monthly.map((row) => ({
      month: row.bucket,
      income: numeric(row.income),
      spend: numeric(row.spend),
    })),
    byCategory: categoryQuery(db, where),
    topMerchants: merchantQuery(db, where),
  };
}
