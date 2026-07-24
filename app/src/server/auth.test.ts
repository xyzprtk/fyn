import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { sessions } from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import {
  createSession,
  deleteSession,
  getPasswordHash,
  hashPassword,
  isPasswordSet,
  setPasswordHash,
  validateSession,
  verifyPassword,
} from "./auth";

const DAY_MS = 24 * 60 * 60 * 1000;

function sessionExpiry(db: ReturnType<typeof createTestDb>, token: string) {
  return db.select().from(sessions).where(eq(sessions.token, token)).get()
    ?.expiresAt;
}

describe("password hashing", () => {
  it("round-trips a correct password", () => {
    const stored = hashPassword("hunter2hunter");
    expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword("hunter2hunter", stored)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const stored = hashPassword("hunter2hunter");
    expect(verifyPassword("hunter2hunteR", stored)).toBe(false);
  });

  it("rejects malformed stored hashes", () => {
    expect(verifyPassword("x", "nonsense")).toBe(false);
    expect(verifyPassword("x", ":deadbeef")).toBe(false);
    expect(verifyPassword("x", "")).toBe(false);
  });

  it("salts every hash differently", () => {
    expect(hashPassword("same-input")).not.toBe(hashPassword("same-input"));
  });
});

describe("password storage", () => {
  it("starts unset and persists the hash", () => {
    const db = createTestDb();
    expect(isPasswordSet(db)).toBe(false);
    expect(getPasswordHash(db)).toBeNull();

    setPasswordHash(db, hashPassword("secret123"));
    expect(isPasswordSet(db)).toBe(true);
    expect(verifyPassword("secret123", getPasswordHash(db) ?? "")).toBe(true);
  });
});

describe("sessions", () => {
  it("creates and validates a session", () => {
    const db = createTestDb();
    const token = createSession(db);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(validateSession(db, token)).toBe(true);
  });

  it("rejects unknown tokens", () => {
    const db = createTestDb();
    expect(validateSession(db, "f".repeat(64))).toBe(false);
  });

  it("rejects and removes expired sessions", () => {
    const db = createTestDb();
    // created 31 days ago -> expired 1 day ago
    const token = createSession(db, Date.now() - 31 * DAY_MS);
    expect(validateSession(db, token)).toBe(false);
    expect(sessionExpiry(db, token)).toBeUndefined();
  });

  it("rolls expiry forward for aging sessions", () => {
    const db = createTestDb();
    // created 29.5 days ago -> expires in 12h, inside the refresh window
    const token = createSession(db, Date.now() - 29.5 * DAY_MS);
    const before = sessionExpiry(db, token)?.getTime();

    expect(validateSession(db, token)).toBe(true);

    const after = sessionExpiry(db, token)?.getTime();
    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(after).toBeGreaterThan(before as number);
    expect((after as number) - Date.now()).toBeGreaterThan(29 * DAY_MS);
  });

  it("does not rewrite fresh sessions", () => {
    const db = createTestDb();
    const token = createSession(db);
    const before = sessionExpiry(db, token)?.getTime();

    expect(validateSession(db, token)).toBe(true);
    expect(sessionExpiry(db, token)?.getTime()).toBe(before);
  });

  it("invalidates on delete", () => {
    const db = createTestDb();
    const token = createSession(db);
    deleteSession(db, token);
    expect(validateSession(db, token)).toBe(false);
  });
});
