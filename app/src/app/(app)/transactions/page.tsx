import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { listRecentTransactions } from "@/server/queries";

function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function amountLabel(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));
}

export default function TransactionsPage() {
  const rows = listRecentTransactions(getDb());

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Ledger / latest</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Transactions</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your latest committed rows. Full filters and inline editing arrive with the transaction workspace.
      </p>
      </header>

      {rows.length === 0 ? (
        <div className="border-t border-border pt-8">
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
          <Button asChild className="mt-4">
            <Link href="/upload">Upload a statement</Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Description</th>
                <th className="px-3 py-3 font-medium">Account</th>
                <th className="px-3 py-3 font-medium">Category</th>
                <th className="px-3 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map(({ transaction, accountName }) => (
                <tr key={transaction.id}>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{dateLabel(transaction.date)}</td>
                  <td className="max-w-[360px] truncate px-3 py-3">{transaction.description || "(no description)"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{accountName}</td>
                  <td className="px-3 py-3 text-muted-foreground">{transaction.category}</td>
                  <td className={`whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums ${transaction.type === "credit" ? "text-success" : "text-foreground"}`}>
                    {transaction.type === "credit" ? "+" : "-"}{amountLabel(transaction.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
