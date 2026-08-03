import { getDb } from "@/db/client";
import { isCategory } from "@/lib/categories";
import { isAuthenticated } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";
import { listTransactions, updateTransaction } from "@/server/transactions";

export const runtime = "nodejs";

function optionalId(value: string | null): number | undefined {
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) throw new Error("invalid_account");
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error("invalid_account");
  return parsed;
}

function optionalPage(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  const params = new URL(request.url).searchParams;
  try {
    const type = params.get("type");
    if (type && type !== "debit" && type !== "credit") return jsonError(400, "invalid_type");
    return Response.json(
      listTransactions(db, {
        page: optionalPage(params.get("page")),
        accountId: optionalId(params.get("account")),
        category: params.get("category") || undefined,
        type: type as "debit" | "credit" | undefined,
        search: params.get("search") || undefined,
        from: params.get("from") || undefined,
        to: params.get("to") || undefined,
      }),
    );
  } catch (error) {
    return error instanceof Error && error.message === "invalid_date"
      ? jsonError(400, "invalid_date")
      : jsonError(400, "invalid_transaction_filter");
  }
}

export async function PATCH(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  const body = await readJson(request);
  const rawId = body?.id;
  const id = typeof rawId === "number" ? rawId : typeof rawId === "string" ? Number(rawId) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) return jsonError(400, "invalid_id");

  const patch: { id: number; description?: string; amount?: number; category?: string } = { id };
  if (body?.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length > 2000) {
      return jsonError(400, "invalid_description");
    }
    patch.description = body.description.trim();
  }
  if (body?.amount !== undefined) {
    if (typeof body.amount !== "number" || !Number.isFinite(body.amount)) return jsonError(400, "invalid_amount");
    patch.amount = body.amount;
  }
  if (body?.category !== undefined) {
    if (!isCategory(body.category)) return jsonError(400, "invalid_category");
    patch.category = body.category;
  }
  if (Object.keys(patch).length === 1) return jsonError(400, "nothing_to_update");

  const transaction = updateTransaction(db, patch);
  return transaction ? Response.json({ transaction }) : jsonError(404, "transaction_not_found");
}
