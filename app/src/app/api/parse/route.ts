import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getDb } from "@/db/client";
import { getAccount } from "@/server/queries";
import { isAuthenticated } from "@/server/auth";
import { jsonError } from "@/server/http";
import { uploadRootPath } from "@/server/imports";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".pdf"]);

function parseAccountId(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const id = Number.parseInt(value, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function cleanFilename(value: string): string {
  const filename = path.basename(value).trim();
  const extension = path.extname(filename).toLocaleLowerCase();
  if (!filename || !ALLOWED_EXTENSIONS.has(extension)) return "";
  return filename.slice(0, 255);
}

export async function POST(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");

  const form = await request.formData();
  const file = form.get("file");
  const accountId = parseAccountId(form.get("accountId"));
  if (!(file instanceof File)) return jsonError(400, "file_required");
  if (!accountId) return jsonError(400, "invalid_account");

  const account = getAccount(db, accountId);
  if (!account) return jsonError(404, "account_not_found");

  const filename = cleanFilename(file.name || "statement.csv");
  if (!filename) return jsonError(400, "unsupported_type");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) return jsonError(422, "empty_file");
  if (bytes.length > MAX_UPLOAD_BYTES) return jsonError(422, "file_too_large");

  const uploadId = randomUUID();
  const root = uploadRootPath();
  const tempPath = path.join(root, ".tmp", `${uploadId}${path.extname(filename).toLocaleLowerCase()}`);
  await fs.mkdir(path.dirname(tempPath), { recursive: true });
  await fs.writeFile(tempPath, bytes);

  const parserForm = new FormData();
  parserForm.append(
    "file",
    new Blob([bytes], { type: file.type || "application/octet-stream" }),
    filename,
  );
  parserForm.append("bank", account.bank);

  try {
    const parserUrl = process.env.PARSER_URL ?? "http://127.0.0.1:8000/parse";
    const response = await fetch(parserUrl, {
      method: "POST",
      body: parserForm,
      signal: AbortSignal.timeout(30_000),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      await fs.rm(tempPath, { force: true });
      if (response.status === 422 && payload && typeof payload === "object") {
        const body = payload as { detail?: unknown; reason?: unknown };
        return Response.json(
          {
            error: typeof body.detail === "string" ? body.detail : "unparseable_file",
            reason: typeof body.reason === "string" ? body.reason : undefined,
          },
          { status: 422 },
        );
      }
      return jsonError(502, "parser_error");
    }

    return Response.json({
      ...(payload as Record<string, unknown>),
      uploadId,
      originalFilename: filename,
    });
  } catch {
    await fs.rm(tempPath, { force: true });
    return jsonError(502, "parser_unreachable");
  }
}
