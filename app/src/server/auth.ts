import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import type { DB } from "@/db/client";
import { sessions, settings } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/constants";

const PASSWORD_KEY = "password_hash";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
// rolling expiry, throttled to one db write per day per session
const SESSION_REFRESH_AFTER_MS = 29 * 24 * 60 * 60 * 1000;

/** scrypt from node:crypto — zero extra deps, no native build issues. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const candidate = scryptSync(password, salt, 64);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function getPasswordHash(db: DB): string | null {
  const row = db
    .select()
    .from(settings)
    .where(eq(settings.key, PASSWORD_KEY))
    .get();
  return row?.value ?? null;
}

export function isPasswordSet(db: DB): boolean {
  return getPasswordHash(db) !== null;
}

export function setPasswordHash(db: DB, hash: string): void {
  db.insert(settings)
    .values({ key: PASSWORD_KEY, value: hash })
    .onConflictDoUpdate({ target: settings.key, set: { value: hash } })
    .run();
}

export function createSession(db: DB, now: number = Date.now()): string {
  const token = randomBytes(32).toString("hex");
  db.insert(sessions)
    .values({ token, expiresAt: new Date(now + SESSION_TTL_MS) })
    .run();
  return token;
}

export function validateSession(
  db: DB,
  token: string,
  now: number = Date.now(),
): boolean {
  const row = db.select().from(sessions).where(eq(sessions.token, token)).get();
  if (!row) return false;
  if (row.expiresAt.getTime() <= now) {
    db.delete(sessions).where(eq(sessions.token, token)).run();
    return false;
  }
  if (row.expiresAt.getTime() - now < SESSION_REFRESH_AFTER_MS) {
    db.update(sessions)
      .set({ expiresAt: new Date(now + SESSION_TTL_MS) })
      .where(eq(sessions.token, token))
      .run();
  }
  return true;
}

export function deleteSession(db: DB, token: string): void {
  db.delete(sessions).where(eq(sessions.token, token)).run();
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_MS / 1000,
} as const;

// --- request-scoped helpers (route handlers / server components only) ---

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function isAuthenticated(db: DB): Promise<boolean> {
  const token = await getSessionToken();
  return token !== null && validateSession(db, token);
}
