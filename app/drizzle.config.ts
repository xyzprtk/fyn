import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

// Same default as src/db/client.ts#resolveDbPath — keep the two in sync.
// drizzle-kit resolves this relative to cwd (the app/ directory).
const dbPath =
  process.env.FYN_DB_PATH ?? path.resolve(process.cwd(), "..", "data", "fyn.db");

// drizzle-kit does not create the parent directory of the database file —
// make sure <repo>/data exists before any command touches the db.
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: dbPath,
  },
});
