import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

export type DB = BetterSQLite3Database<typeof schema>;

/**
 * The database lives at <repo>/data/fyn.db by default. cwd is the app/
 * directory for every script that touches the db (dev, migrate, seed, test),
 * so ../data resolves to the repo root. FYN_DB_PATH overrides.
 */
export function resolveDbPath(): string {
  return process.env.FYN_DB_PATH ?? path.resolve(process.cwd(), "..", "data", "fyn.db");
}

export function createDb(dbPath: string): DB {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  if (dbPath !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
  }
  return drizzle(sqlite, { schema });
}

let cached: DB | null = null;

/** Lazily opened singleton for the running app. Tests use createDb(":memory:"). */
export function getDb(): DB {
  if (!cached) {
    cached = createDb(resolveDbPath());
  }
  return cached;
}
