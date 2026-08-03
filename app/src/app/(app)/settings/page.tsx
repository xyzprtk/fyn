import { AccountsSection } from "@/components/settings/accounts-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { ImportHistorySection } from "@/components/settings/import-history-section";
import { RulesSection } from "@/components/settings/rules-section";
import { SecuritySection } from "@/components/settings/security-section";

export default function SettingsPage() {
  return (
    <div className="space-y-12">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">System / local</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Keep the ledger personal, predictable, and easy to maintain.
      </p>
      </header>
      <AccountsSection />
      <RulesSection />
      <SecuritySection />
      <AppearanceSection />
      <ImportHistorySection />
    </div>
  );
}
