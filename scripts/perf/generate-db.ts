import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";

import { migrate } from "../../app/node_modules/drizzle-orm/better-sqlite3/migrator.js";

import { createDb } from "../../app/src/db/client.ts";
import { accounts, sessions, settings, transactions } from "../../app/src/db/schema.ts";

const ROW_BATCH_SIZE = 500;
const DAY_MS = 24 * 60 * 60 * 1000;
const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Rent", "Salary", "Other"] as const;
const MERCHANTS = ["SWIGGY", "UBER", "AMAZON", "ELECTRICITY", "RENT", "SALARY", "PHARMACY"] as const;

function passwordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function readCount(): number {
  const count = Number.parseInt(process.argv[2] ?? "10000", 10);
  if (!Number.isSafeInteger(count) || count < 1 || count > 250000) {
    throw new Error("count must be an integer between 1 and 250000");
  }
  return count;
}

function readPath(): string {
  const value = process.argv[3] ?? process.env.FYN_DB_PATH;
  if (!value) throw new Error("pass a database path as the second argument or set FYN_DB_PATH");
  return path.resolve(value);
}

function main() {
  const count = readCount();
  const dbPath = readPath();
  const fixturePassword = process.env.FYN_PERF_PASSWORD ?? randomBytes(32).toString("hex");
  const db = createDb(dbPath);
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });

  const start = Date.UTC(2024, 0, 1);
  db.transaction((tx) => {
    tx.delete(sessions).run();
    tx.delete(transactions).run();
    tx.delete(settings).run();

    const account = tx
      .insert(accounts)
      .values({ name: "Performance fixture", bank: "generic", accountNumber: "0000" })
      .returning({ id: accounts.id })
      .get();

    for (let offset = 0; offset < count; offset += ROW_BATCH_SIZE) {
      const batch = [];
      const end = Math.min(offset + ROW_BATCH_SIZE, count);
      for (let index = offset; index < end; index += 1) {
        const isCredit = index % 11 === 0;
        const category = CATEGORIES[index % CATEGORIES.length];
        const merchant = MERCHANTS[index % MERCHANTS.length];
        const amount = isCredit ? 45000 + (index % 2000) : -(200 + (index % 18000));
        const date = new Date(start + (index % 1096) * DAY_MS);
        batch.push({
          accountId: account.id,
          date,
          description: `${merchant} PERFORMANCE ${index % 1000}`,
          amount,
          type: isCredit ? "credit" as const : "debit" as const,
          balance: 100000 + index * 17 + amount,
          category,
          reference: `PERF${String(index).padStart(10, "0")}`,
          hash: `performance-${index}`,
        });
      }
      tx.insert(transactions).values(batch).run();
    }

    tx.insert(settings).values({ key: "password_hash", value: passwordHash(fixturePassword) }).run();
    tx.insert(sessions).values({
      token: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + 30 * DAY_MS),
    }).run();
  });

  const session = db.select().from(sessions).get();
  if (!session) throw new Error("could not create benchmark session");
  console.log(JSON.stringify({
    dbPath,
    rows: count,
    cookie: `fyn_session=${session.token}`,
    password: fixturePassword,
  }, null, 2));
}

main();
