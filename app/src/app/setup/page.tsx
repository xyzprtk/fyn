import { redirect } from "next/navigation";

import { PasswordCard } from "@/components/auth/password-card";
import { getDb } from "@/db/client";
import { isPasswordSet } from "@/server/auth";

// reads the db on every request — never prerender a stale "no password" state
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (isPasswordSet(getDb())) redirect("/");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4">
      <span className="font-mono text-2xl font-semibold tracking-tight">
        fyn
      </span>
      <PasswordCard mode="setup" />
    </main>
  );
}
