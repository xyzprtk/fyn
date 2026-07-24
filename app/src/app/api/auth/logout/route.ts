import { cookies } from "next/headers";

import { getDb } from "@/db/client";
import { SESSION_COOKIE } from "@/lib/constants";
import { deleteSession } from "@/server/auth";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    deleteSession(getDb(), token);
  }
  store.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
