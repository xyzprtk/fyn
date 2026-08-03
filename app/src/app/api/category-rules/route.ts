import { getDb } from "@/db/client";
import { isCategory } from "@/lib/categories";
import { isAuthenticated } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";
import { deleteCategoryRule, listCategoryRules, updateCategoryRule } from "@/server/settings";
import { saveCategoryRule } from "@/server/transactions";

export const runtime = "nodejs";

function parseId(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  return null;
}

export async function GET() {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  return Response.json({ rules: listCategoryRules(db) });
}

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

export async function PATCH(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  const body = await readJson(request);
  const id = parseId(body?.id);
  if (!id) return jsonError(400, "invalid_id");
  const category = body?.category;
  const priority = body?.priority;
  if (!isCategory(category)) return jsonError(400, "invalid_category");
  if (typeof priority !== "number" || !Number.isInteger(priority)) return jsonError(400, "invalid_priority");
  const rule = updateCategoryRule(db, id, { category, priority });
  return rule ? Response.json({ rule }) : jsonError(404, "rule_not_found");
}

export async function DELETE(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  const id = parseId(new URL(request.url).searchParams.get("id"));
  if (!id) return jsonError(400, "invalid_id");
  const rule = deleteCategoryRule(db, id);
  return rule ? Response.json({ ok: true }) : jsonError(404, "rule_not_found");
}
