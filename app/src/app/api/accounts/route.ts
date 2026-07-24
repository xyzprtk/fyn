import { getDb } from "@/db/client";
import { isBankKey } from "@/lib/banks";
import { isAuthenticated } from "@/server/auth";
import { jsonError, readJson } from "@/server/http";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  type AccountInput,
} from "@/server/queries";

function parseName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 80 ? name : null;
}

function parseAccountNumber(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length <= 24 ? trimmed : undefined;
}

function parseCurrency(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value)) return undefined;
  return value.toUpperCase();
}

function parseId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10);
  return null;
}

export async function GET() {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");
  return Response.json({ accounts: listAccounts(db) });
}

export async function POST(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");

  const body = await readJson(request);
  const name = parseName(body?.name);
  const bank = body?.bank;
  const accountNumber = parseAccountNumber(body?.accountNumber);
  const currency = parseCurrency(body?.currency);

  if (!name) return jsonError(400, "invalid_name");
  if (!isBankKey(bank)) return jsonError(400, "invalid_bank");
  if (accountNumber === undefined) return jsonError(400, "invalid_account_number");
  if (currency === undefined) return jsonError(400, "invalid_currency");

  const input: AccountInput = { name, bank };
  if (accountNumber) input.accountNumber = accountNumber;
  if (currency) input.currency = currency;

  const account = createAccount(db, input);
  return Response.json({ account }, { status: 201 });
}

export async function PATCH(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");

  const body = await readJson(request);
  const id = parseId(body?.id);
  if (!id) return jsonError(400, "invalid_id");

  const patch: Partial<AccountInput> = {};
  if (body?.name !== undefined) {
    const name = parseName(body.name);
    if (!name) return jsonError(400, "invalid_name");
    patch.name = name;
  }
  if (body?.bank !== undefined) {
    if (!isBankKey(body.bank)) return jsonError(400, "invalid_bank");
    patch.bank = body.bank;
  }
  if (body?.accountNumber !== undefined) {
    const accountNumber = parseAccountNumber(body.accountNumber);
    if (accountNumber === undefined) return jsonError(400, "invalid_account_number");
    patch.accountNumber = accountNumber;
  }
  if (body?.currency !== undefined) {
    const currency = parseCurrency(body.currency);
    if (!currency) return jsonError(400, "invalid_currency");
    patch.currency = currency;
  }
  if (Object.keys(patch).length === 0) return jsonError(400, "nothing_to_update");

  const account = updateAccount(db, id, patch);
  if (!account) return jsonError(404, "account_not_found");
  return Response.json({ account });
}

export async function DELETE(request: Request) {
  const db = getDb();
  if (!(await isAuthenticated(db))) return jsonError(401, "unauthorized");

  const queryId = parseId(new URL(request.url).searchParams.get("id"));
  const bodyId = queryId ?? parseId((await readJson(request))?.id);
  if (!bodyId) return jsonError(400, "invalid_id");

  const deleted = deleteAccount(db, bodyId);
  if (!deleted) return jsonError(404, "account_not_found");
  return Response.json({ ok: true });
}
