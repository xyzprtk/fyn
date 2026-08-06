import path from "node:path";

import Database from "../../app/node_modules/better-sqlite3/lib/index.js";

const dbPath = process.argv[2];
if (!dbPath) throw new Error("pass a database path");

const db = new Database(path.resolve(dbPath), { readonly: true });
const queries = [
  ["all-account date range", "select id from transactions where date >= 1704067200 and date < 1798761600"],
  ["account date pagination", "select id from transactions where account_id = 1 order by date desc, id desc limit 50 offset 1000"],
  ["account category date", "select id from transactions where account_id = 1 and category = 'Food' and date >= 1704067200 order by date desc, id desc limit 50"],
];

for (const [label, query] of queries) {
  const plan = db.prepare(`explain query plan ${query}`).all();
  console.log(label);
  for (const row of plan) console.log(`  ${row.detail}`);
}

db.close();
