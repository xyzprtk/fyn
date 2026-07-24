import { AccountsSection } from "@/components/settings/accounts-section";

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Accounts, category rules, password, theme and import history.
      </p>
      <div className="mt-8">
        <AccountsSection />
      </div>
    </div>
  );
}
