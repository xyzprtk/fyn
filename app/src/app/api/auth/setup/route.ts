import { cookies } from "next/headers";

import { getDb } from "@/db/client";
import { SESSION_COOKIE } from "@/lib/constants";
import {
  createSession,
  hashPassword,
  isPasswordSet,
  sessionCookieOptions,
  setPasswordHash,
} from "@/server/auth";
import { jsonError, readJson } from "@/server/http";

export async function POST(request: Request) {
  const body = await readJson(request);
  const password = body?.password;
  if (typeof password !== "string" || password.length < 8) {
    return jsonError(400, "password_too_short");
  }

  const db = getDb();
  if (isPasswordSet(db)) {
    return jsonError(409, "password_already_set");
  }

  setPasswordHash(db, hashPassword(password));
  const token = createSession(db);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
  return Response.json({ ok: true });
}
