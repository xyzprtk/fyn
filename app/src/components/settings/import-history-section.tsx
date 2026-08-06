"use client"

import { Button } from "@/components/ui/button"
import { useImportHistory } from "@/hooks/use-settings"
import type { ImportHistoryItem } from "@/lib/settings-types"

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

export function ImportHistorySection() {
  const history = useImportHistory()

  return (
    <section className="max-w-4xl">
      <h2 className="text-base font-semibold tracking-tight">Import history</h2>
      <p className="mt-1 text-sm text-muted-foreground">Every saved statement, including duplicate-only re-imports.</p>
      <div className="mt-5 overflow-hidden rounded-lg border">
        {history.isPending && <div className="space-y-2 px-4 py-4"><div className="h-4 w-64 animate-pulse rounded bg-muted" /><div className="h-4 w-80 animate-pulse rounded bg-muted" /></div>}
        {history.isError && <div className="flex items-center justify-between gap-4 px-4 py-3"><p className="text-sm text-destructive">Could not load import history.</p><Button variant="outline" size="sm" onClick={() => void history.refetch()}>Retry</Button></div>}
        {history.data?.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No statements have been saved yet.</p>}
        {history.data?.map((item) => <HistoryRow key={item.id} item={item} />)}
      </div>
    </section>
  )
}

function HistoryRow({ item }: { item: ImportHistoryItem }) {
  return (
    <div className="grid gap-2 border-b border-border/70 px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div className="min-w-0"><p className="truncate text-sm font-medium">{item.filename}</p><p className="truncate text-xs text-muted-foreground">{item.originalFilename} · {item.accountName} · {dateLabel(item.importedAt)}</p></div>
      <span className="font-mono text-xs text-success">+{item.rowsNew} new</span>
      <span className="font-mono text-xs text-muted-foreground">{item.rowsDupes} dupes</span>
    </div>
  )
}
