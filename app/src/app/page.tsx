import { redirect } from "next/navigation";

import { PasswordCard } from "@/components/auth/password-card";
import { getDb } from "@/db/client";
import { isAuthenticated, isPasswordSet } from "@/server/auth";

export default async function LoginPage() {
  const db = getDb();
  if (!isPasswordSet(db)) redirect("/setup");
  if (await isAuthenticated(db)) redirect("/dashboard");

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4">
      <span className="font-mono text-2xl font-semibold tracking-tight">
        fyn
      </span>
      <PasswordCard mode="login" />
      <p className="text-xs text-muted-foreground">
        Local-only. Your data never leaves this machine.
      </p>
    </main>
  );
}
