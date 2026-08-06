"use client"

import dynamic from "next/dynamic"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { useStats } from "@/hooks/use-stats"
import { formatCurrency, formatPercent } from "@/lib/format"
import type { StatsResponse } from "@/lib/stats-types"
import type { Account } from "@/server/queries"

const FinanceCharts = dynamic(
  () => import("@/components/charts/finance-charts").then((module) => module.FinanceCharts),
  { ssr: false, loading: () => <ChartsSkeleton /> },
)

type Preset = "this-month" | "last-month" | "3m" | "6m" | "12m" | "all"

const PRESETS: Array<{ key: Preset; label: string }> = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "12m", label: "12M" },
  { key: "all", label: "All" },
]

type DashboardClientProps = {
  initialAccounts: Account[]
  initialStats: StatsResponse
  initialFilters: { from?: string; to?: string; accountId?: number }
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function rangeForPreset(preset: Preset): { from?: string; to?: string } {
  const now = new Date()
  const thisMonth = startOfMonth(now)
  if (preset === "all") return {}
  if (preset === "this-month") return { from: isoDay(thisMonth), to: isoDay(now) }
  if (preset === "last-month") {
    const from = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - 1, 1))
    const to = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth(), 0))
    return { from: isoDay(from), to: isoDay(to) }
  }
  const months = preset === "3m" ? 3 : preset === "6m" ? 6 : 12
  const from = new Date(Date.UTC(thisMonth.getUTCFullYear(), thisMonth.getUTCMonth() - (months - 1), 1))
  return { from: isoDay(from), to: isoDay(now) }
}

function activePreset(from: string, to: string): Preset | null {
  for (const preset of PRESETS) {
    const range = rangeForPreset(preset.key)
    if ((range.from ?? "") === from && (range.to ?? "") === to) return preset.key
  }
  return null
}

function DashboardSkeleton() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {["income", "spend", "net", "month"].map((key) => <div key={key} className="h-28 animate-pulse rounded-xl bg-muted" />)}
      <div className="h-56 animate-pulse rounded-xl bg-muted lg:col-span-4" />
    </div>
  )
}

function ChartsSkeleton() {
  return (
    <div className="mt-10 grid gap-x-8 gap-y-12 lg:grid-cols-2">
      {["spend", "income", "category", "merchant"].map((key) => <div key={key} className="h-72 animate-pulse border-t border-border bg-muted/40" />)}
    </div>
  )
}

export function DashboardClient({ initialAccounts, initialStats, initialFilters }: DashboardClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const accounts = useAccounts(initialAccounts)
  const from = searchParams.get("from") ?? ""
  const to = searchParams.get("to") ?? ""
  const accountParam = searchParams.get("account") ?? ""
  const accountId = accountParam ? Number(accountParam) : undefined
  const validAccountId = typeof accountId === "number" && Number.isSafeInteger(accountId) && accountId > 0
  const initialMatches =
    (initialFilters.from ?? "") === from &&
    (initialFilters.to ?? "") === to &&
    (initialFilters.accountId ?? undefined) === (validAccountId ? accountId : undefined)
  const stats = useStats(
    {
      from: from || undefined,
      to: to || undefined,
      accountId: validAccountId ? accountId : undefined,
    },
    initialMatches ? initialStats : undefined,
  )

  function setParams(patch: { from?: string; to?: string; account?: string }) {
    const params = new URLSearchParams(searchParams.toString())
    for (const key of ["from", "to", "account"]) params.delete(key)
    if (patch.from) params.set("from", patch.from)
    if (patch.to) params.set("to", patch.to)
    if (patch.account) params.set("account", patch.account)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const selectedAccount = accounts.data?.find((account) => String(account.id) === accountParam)
  const preset = activePreset(from, to)

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Overview / live ledger</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">A clear read on where your money moved.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={accountParam || "all"} onValueChange={(value) => setParams({ from, to, account: value === "all" ? "" : value })}>
            <SelectTrigger className="w-44" aria-label="Filter by account">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.data?.map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="mt-7 flex flex-wrap items-center gap-1 border-b border-border pb-3">
        {PRESETS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`rounded-md px-2.5 py-1.5 text-xs transition-colors ${preset === item.key ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            onClick={() => setParams({ ...rangeForPreset(item.key), account: accountParam })}
          >
            {item.label}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-border" />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          From
          <input type="date" value={from} onChange={(event) => setParams({ from: event.target.value, to, account: accountParam })} className="h-7 rounded-md border border-input bg-transparent px-2 text-foreground outline-none focus:border-ring" />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          To
          <input type="date" value={to} onChange={(event) => setParams({ from, to: event.target.value, account: accountParam })} className="h-7 rounded-md border border-input bg-transparent px-2 text-foreground outline-none focus:border-ring" />
        </label>
      </div>

      {selectedAccount && <p className="mt-4 text-xs text-muted-foreground">Showing {selectedAccount.name}.</p>}
      {stats.isPending && <DashboardSkeleton />}
      {stats.isError && <div className="mt-8 border-l-2 border-destructive px-3 py-2 text-sm text-destructive">Could not load dashboard data. Refresh to retry.</div>}
      {stats.data && (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Income" value={stats.data.summary.income} tone="success" />
            <SummaryCard label="Spend" value={stats.data.summary.spend} />
            <SummaryCard label="Net left" value={stats.data.summary.net} />
            <SummaryCard label="Spent this month" value={stats.data.summary.spentThisMonth} />
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="border-t border-border pt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Selected period</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {stats.data.period.from && stats.data.period.to ? `${stats.data.period.from} to ${stats.data.period.to}` : "No transactions in this range"}
              </p>
            </div>
            <FynCard score={stats.data.fyn.score} verdict={stats.data.fyn.verdict} savingsRate={stats.data.fyn.savingsRate} />
          </section>

          <FinanceCharts stats={stats.data} />
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "success" }) {
  return (
    <Card>
      <CardHeader className="pb-1"><CardTitle className="text-xs font-normal text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><p className={`font-mono text-xl font-medium tabular-nums ${tone === "success" ? "text-success" : ""}`}>{formatCurrency(value)}</p></CardContent>
    </Card>
  )
}

function FynCard({ score, verdict, savingsRate }: { score: number; verdict: string; savingsRate: number }) {
  const copy = verdict === "FYN" ? "You are FYN" : verdict === "MOSTLY_FYN" ? "Mostly FYN" : "Needs a little FYN"
  return (
    <Card className="border-primary/30 bg-primary/[0.04]">
      <CardContent className="flex items-center gap-5 pt-5">
        <div className="relative grid size-20 shrink-0 place-items-center rounded-full border-4 border-primary/20">
          <div className="absolute inset-[-4px] rounded-full border-4 border-primary" style={{ clipPath: `inset(${100 - score}% 0 0 0)` }} />
          <span className="font-mono text-2xl font-semibold tabular-nums text-primary">{score}</span>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">FYN score</p>
          <p className="mt-1 font-medium">{copy}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatPercent(savingsRate)} savings rate</p>
        </div>
      </CardContent>
    </Card>
  )
}
