/**
 * Seeds the default category keyword rules. Idempotent: existing keywords
 * (including user-edited ones) are left untouched. Run via `pnpm db:seed`.
 */
import { createDb, resolveDbPath } from "./client";
import { categoryRules } from "./schema";

const DEFAULT_RULES: ReadonlyArray<readonly [string, string]> = [
  // Food
  ["swiggy", "Food"],
  ["zomato", "Food"],
  ["eatery", "Food"],
  ["restaurant", "Food"],
  ["cafe", "Food"],
  // Transport
  ["uber", "Transport"],
  ["ola cabs", "Transport"],
  ["rapido", "Transport"],
  ["irctc", "Transport"],
  ["redbus", "Transport"],
  ["fuel", "Transport"],
  ["petrol", "Transport"],
  // Shopping
  ["amazon", "Shopping"],
  ["flipkart", "Shopping"],
  ["myntra", "Shopping"],
  ["ajio", "Shopping"],
  // Bills
  ["electricity", "Bills"],
  ["broadband", "Bills"],
  ["mobile recharge", "Bills"],
  ["recharge", "Bills"],
  ["insurance", "Bills"],
  // Rent
  ["rent", "Rent"],
  // Salary
  ["salary", "Salary"],
  ["payroll", "Salary"],
  // Transfer
  ["upi transfer", "Transfer"],
  ["fund transfer", "Transfer"],
  ["neft", "Transfer"],
  ["imps", "Transfer"],
  // Health
  ["pharmacy", "Health"],
  ["apollo", "Health"],
  ["hospital", "Health"],
  ["clinic", "Health"],
  // Entertainment
  ["netflix", "Entertainment"],
  ["spotify", "Entertainment"],
  ["hotstar", "Entertainment"],
  ["bookmyshow", "Entertainment"],
  ["movie", "Entertainment"],
];

function main() {
  const db = createDb(resolveDbPath());
  let inserted = 0;
  for (const [keyword, category] of DEFAULT_RULES) {
    const result = db
      .insert(categoryRules)
      .values({ keyword, category })
      .onConflictDoNothing({ target: categoryRules.keyword })
      .run();
    if (result.changes > 0) inserted += 1;
  }
  const skipped = DEFAULT_RULES.length - inserted;
  process.stdout.write(
    `seed: ${inserted} category rules inserted, ${skipped} already present\n`,
  );
}

main();
