import { DashboardClient } from "./dashboard-client";
import { getDb } from "@/db/client";
import { listAccounts } from "@/server/queries";
import { getStats } from "@/server/stats";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validDay(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function validAccount(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const id = Number.parseInt(value, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const from = validDay(first(params.from));
  const to = validDay(first(params.to));
  const accountId = validAccount(first(params.account));
  const filters = { from, to, accountId };
  const db = getDb();

  return (
    <DashboardClient
      initialAccounts={listAccounts(db)}
      initialStats={getStats(db, filters)}
      initialFilters={filters}
    />
  );
}
