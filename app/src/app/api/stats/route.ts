import { getDb } from "@/db/client";
import { getAccount } from "@/server/queries";
import { isAuthenticated } from "@/server/auth";
import { jsonError } from "@/server/http";
import { getStats } from "@/server/stats";

export const runtime = "nodejs";

function id(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  if (!/^\d+$/.test(value)) throw new Error("invalid_account");
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error("invalid_account");
  return parsed;
}

export async function GET(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");

  try {
    const params = new URL(request.url).searchParams;
    const accountId = id(params.get("account"));
    if (accountId !== undefined && !getAccount(db, accountId)) return jsonError(404, "account_not_found");
    const from = params.get("from") || undefined;
    const to = params.get("to") || undefined;
    if (from && to && from > to) return jsonError(400, "invalid_period");
    return Response.json(getStats(db, { accountId, from, to }));
  } catch (error) {
    return error instanceof Error && error.message === "invalid_date"
      ? jsonError(400, "invalid_date")
      : jsonError(400, "invalid_stats_filter");
  }
}
