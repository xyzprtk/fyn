import { getDb } from "@/db/client";
import { isAuthenticated } from "@/server/auth";
import { jsonError } from "@/server/http";
import {
  commitImport,
  ImportValidationError,
  type ImportInput,
} from "@/server/imports";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRequest(value: unknown): ImportInput | null {
  if (!isRecord(value)) return null;
  const accountId = value.accountId;
  if (typeof accountId !== "number" || !Number.isSafeInteger(accountId)) return null;
  if (typeof value.uploadId !== "string" || typeof value.originalFilename !== "string") return null;
  if (value.period !== null && value.period !== undefined && !isRecord(value.period)) return null;
  if (!Array.isArray(value.rows)) return null;

  return {
    accountId,
    uploadId: value.uploadId,
    originalFilename: value.originalFilename,
    period: value.period
      ? { from: String(value.period.from ?? ""), to: String(value.period.to ?? "") }
      : null,
    rows: value.rows as ImportInput["rows"],
  };
}

export async function POST(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json");
  }
  const input = parseRequest(body);
  if (!input) return jsonError(400, "invalid_import");

  try {
    const result = commitImport(db, input);
    return Response.json(result);
  } catch (error) {
    if (error instanceof ImportValidationError) return jsonError(400, error.code);
    console.error("transaction import failed", error);
    return jsonError(500, "import_failed");
  }
}
