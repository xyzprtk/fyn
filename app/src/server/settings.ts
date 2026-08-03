import { asc, desc, eq } from "drizzle-orm";

import type { DB } from "@/db/client";
import { accounts, categoryRules, imports } from "@/db/schema";
import type { CategoryRule, ImportHistoryItem } from "@/lib/settings-types";

export function listCategoryRules(db: DB): CategoryRule[] {
  return db
    .select()
    .from(categoryRules)
    .orderBy(desc(categoryRules.priority), asc(categoryRules.keyword))
    .all();
}

export function updateCategoryRule(
  db: DB,
  id: number,
  patch: { category?: string; priority?: number },
): CategoryRule | undefined {
  return db
    .update(categoryRules)
    .set(patch)
    .where(eq(categoryRules.id, id))
    .returning()
    .get();
}

export function deleteCategoryRule(db: DB, id: number): CategoryRule | undefined {
  return db.delete(categoryRules).where(eq(categoryRules.id, id)).returning().get();
}

export function listImportHistory(db: DB, limit = 100): ImportHistoryItem[] {
  return db
    .select({ import: imports, accountName: accounts.name })
    .from(imports)
    .innerJoin(accounts, eq(imports.accountId, accounts.id))
    .orderBy(desc(imports.importedAt), desc(imports.id))
    .limit(limit)
    .all()
    .map(({ import: item, accountName }) => ({
      id: item.id,
      accountId: item.accountId,
      accountName,
      filename: item.filename,
      originalFilename: item.originalFilename,
      storedPath: item.storedPath,
      importedAt: item.importedAt.toISOString(),
      rowsNew: item.rowsNew,
      rowsDupes: item.rowsDupes,
      periodFrom: item.periodFrom?.toISOString() ?? null,
      periodTo: item.periodTo?.toISOString() ?? null,
    }));
}
