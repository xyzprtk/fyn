import { cookies } from "next/headers";

import { getDb } from "@/db/client";
import { SESSION_COOKIE } from "@/lib/constants";
import {
  createSession,
  getPasswordHash,
  sessionCookieOptions,
  verifyPassword,
} from "@/server/auth";
import { jsonError, readJson } from "@/server/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  const password = body?.password;
  if (typeof password !== "string" || password.length === 0) {
    return jsonError(400, "password_required");
  }

  const db = getDb();
  const stored = getPasswordHash(db);
  if (!stored) {
    return jsonError(409, "password_not_set");
  }
  if (!verifyPassword(password, stored)) {
    return jsonError(401, "invalid_password");
  }

  const token = createSession(db);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
  return Response.json({ ok: true });
}
