import { AppShell } from "@/components/app-shell";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // TODO(phase-2): gate this group behind the session cookie
  return <AppShell>{children}</AppShell>;
}
