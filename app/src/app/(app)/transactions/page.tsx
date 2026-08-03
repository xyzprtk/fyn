"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { TransactionsTable } from "@/components/transactions/transactions-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { useCreateCategoryRule, useTransactions, useUpdateTransaction } from "@/hooks/use-transactions"
import { CATEGORIES } from "@/lib/categories"
import type { TransactionListRow } from "@/lib/transaction-types"

export default function TransactionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const accounts = useAccounts()
  const updateTransaction = useUpdateTransaction()
  const createRule = useCreateCategoryRule()
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "")

  const page = Number(searchParams.get("page") ?? "1") || 1
  const accountParam = searchParams.get("account") ?? ""
  const category = searchParams.get("category") ?? ""
  const type = searchParams.get("type") as "debit" | "credit" | null
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""
  const query = useTransactions({
    page,
    accountId: accountParam ? Number(accountParam) : undefined,
    category: category || undefined,
    type: type || undefined,
    search: searchParams.get("search") || undefined,
    from: from || undefined,
    to: to || undefined,
  })

  function setParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`)
  }

  function handleSave(patch: { id: number; description?: string; amount?: number; category?: string }, previous: TransactionListRow) {
    updateTransaction.mutate(patch, {
      onSuccess: () => {
        if (patch.category && patch.category !== previous.category && typeof window !== "undefined") {
          const shouldCreate = window.confirm(`Always categorize this transaction as ${patch.category}?`)
          if (shouldCreate) {
            const suggested = (patch.description ?? previous.description).trim().split(/\s+/)[0] ?? ""
            const keyword = window.prompt("Keyword to match", suggested.slice(0, 80))?.trim()
            if (keyword) createRule.mutate({ keyword, category: patch.category })
          }
        }
      },
    })
  }

  return (
    <div className="space-y-7">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Ledger / searchable</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Filter, correct, and keep your ledger honest.</p>
      </header>

      <section className="flex flex-wrap items-end gap-3 border-b border-border pb-5">
        <div className="min-w-52 flex-1">
          <label htmlFor="transaction-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">Search description</label>
          <form onSubmit={(event) => { event.preventDefault(); setParams({ search: search.trim() || undefined, page: undefined }) }}>
            <Input id="transaction-search" value={search} placeholder="UPI, salary, rent..." onChange={(event) => setSearch(event.target.value)} />
          </form>
        </div>
        <FilterSelect label="Account" value={accountParam || "all"} onChange={(value) => setParams({ account: value === "all" ? undefined : value, page: undefined })}>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.data?.map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.name}</SelectItem>)}
        </FilterSelect>
        <FilterSelect label="Category" value={category || "all"} onChange={(value) => setParams({ category: value === "all" ? undefined : value, page: undefined })}>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
        </FilterSelect>
        <FilterSelect label="Type" value={type || "all"} onChange={(value) => setParams({ type: value === "all" ? undefined : value, page: undefined })}>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="debit">Debit</SelectItem>
          <SelectItem value="credit">Credit</SelectItem>
        </FilterSelect>
        <div className="flex items-center gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">From<input type="date" value={from} onChange={(event) => setParams({ from: event.target.value || undefined, page: undefined })} className="h-8 rounded-lg border border-input bg-transparent px-2 text-foreground" /></label>
          <label className="grid gap-1 text-xs text-muted-foreground">To<input type="date" value={to} onChange={(event) => setParams({ to: event.target.value || undefined, page: undefined })} className="h-8 rounded-lg border border-input bg-transparent px-2 text-foreground" /></label>
        </div>
      </section>

      {query.isPending && <div className="h-72 animate-pulse rounded-xl bg-muted" />}
      {query.isError && <p role="alert" className="border-l-2 border-destructive px-3 py-2 text-sm text-destructive">Could not load transactions. Refresh to retry.</p>}
      {query.data?.rows.length === 0 && <p className="border-t border-border pt-8 text-sm text-muted-foreground">No transactions match these filters.</p>}
      {query.data && query.data.rows.length > 0 && (
        <>
          <TransactionsTable rows={query.data.rows} onSave={handleSave} savingId={updateTransaction.isPending ? updateTransaction.variables?.id : undefined} />
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>{query.data.total} transaction{query.data.total === 1 ? "" : "s"} / page {query.data.page} of {query.data.pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={query.data.page <= 1} onClick={() => setParams({ page: String(query.data.page - 1) })}>Previous</Button>
              <Button variant="outline" size="sm" disabled={query.data.page >= query.data.pages} onClick={() => setParams({ page: String(query.data.page + 1) })}>Next</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-36" aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </label>
  )
}
