import type { FynScore } from "./fyn-score";

export type StatsFilters = {
  from?: string;
  to?: string;
  accountId?: number;
};

export type StatsResponse = {
  period: { from: string | null; to: string | null };
  summary: {
    income: number;
    spend: number;
    net: number;
    spentThisMonth: number;
  };
  fyn: FynScore;
  spendOverTime: Array<{ date: string; spend: number; income: number }>;
  incomeVsSpendMonthly: Array<{ month: string; income: number; spend: number }>;
  byCategory: Array<{ category: string; total: number }>;
  topMerchants: Array<{ description: string; total: number; count: number }>;
};
