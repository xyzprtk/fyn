import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { createDb, type DB } from "./client";

/** Fresh in-memory database with all real migrations applied. */
export function createTestDb(): DB {
  const db = createDb(":memory:");
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db;
}
