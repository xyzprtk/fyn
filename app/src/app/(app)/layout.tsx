import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getDb } from "@/db/client";
import { isAuthenticated, isPasswordSet } from "@/server/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const db = getDb();
  if (!isPasswordSet(db)) redirect("/setup");
  if (!(await isAuthenticated(db))) redirect("/");
  return <AppShell>{children}</AppShell>;
}
