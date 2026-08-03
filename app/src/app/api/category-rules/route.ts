import { getDb } from "@/db/client";
import { isCategory } from "@/lib/categories";
import { isAuthenticated } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";
import { saveCategoryRule } from "@/server/transactions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  const body = await readJson(request);
  const keyword = typeof body?.keyword === "string" ? body.keyword.trim().toLocaleLowerCase() : "";
  const category = body?.category;
  const priority = body?.priority === undefined ? 0 : body.priority;
  if (!keyword || keyword.length > 80) return jsonError(400, "invalid_keyword");
  if (!isCategory(category)) return jsonError(400, "invalid_category");
  if (typeof priority !== "number" || !Number.isInteger(priority)) return jsonError(400, "invalid_priority");
  return Response.json({ rule: saveCategoryRule(db, keyword, category, priority) }, { status: 201 });
}
