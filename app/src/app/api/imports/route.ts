import { getDb } from "@/db/client";
import { isAuthenticated } from "@/server/auth";
import { jsonError } from "@/server/http";
import { listImportHistory } from "@/server/settings";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  return Response.json({ imports: listImportHistory(db) });
}
