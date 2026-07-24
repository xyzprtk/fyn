import { PasswordCard } from "@/components/auth/password-card";

export default function SetupPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4">
      <span className="font-mono text-2xl font-semibold tracking-tight">
        fyn
      </span>
      <PasswordCard mode="setup" />
    </main>
  );
}
