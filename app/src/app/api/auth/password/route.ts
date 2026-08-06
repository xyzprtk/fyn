import { getDb } from "@/db/client";
import {
  getPasswordHash,
  hashPassword,
  isAuthenticated,
  setPasswordHash,
  verifyPassword,
} from "@/server/auth";
import { jsonError, readJson } from "@/server/http";

export async function POST(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  const body = await readJson(request);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;
  if (typeof currentPassword !== "string" || !currentPassword) return jsonError(400, "current_password_required");
  if (typeof newPassword !== "string" || newPassword.length < 8) return jsonError(400, "password_too_short");
  if (currentPassword === newPassword) return jsonError(400, "password_same");

  const stored = getPasswordHash(db);
  if (!stored || !verifyPassword(currentPassword, stored)) return jsonError(401, "invalid_password");
  setPasswordHash(db, hashPassword(newPassword));
  return Response.json({ ok: true });
}
