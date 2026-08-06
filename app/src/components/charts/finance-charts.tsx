"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import type { StatsResponse } from "@/lib/stats-types"
import { formatCurrency } from "@/lib/format"

const COLORS = ["#c96b40", "#5c946e", "#a1a1aa", "#b4552d", "#78716c", "#d97706"]
const MONO_STYLE = { fontFamily: "var(--font-geist-mono), monospace", fontSize: 11 }
const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontFamily: "var(--font-geist-mono), monospace",
  fontSize: 12,
}

function shortLabel(value: string): string {
  return value.length > 10 ? value.slice(5) : value
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 border-t border-border pt-4">
      <h2 className="text-sm font-medium">{title}</h2>
      <div className="mt-4 h-64">{children}</div>
    </section>
  )
}

export function FinanceCharts({ stats }: { stats: StatsResponse }) {
  return (
    <div className="mt-10 grid gap-x-8 gap-y-12 lg:grid-cols-2">
      <ChartFrame title="Spending over time">
        {stats.spendOverTime.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats.spendOverTime} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c96b40" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#c96b40" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="date" tickFormatter={shortLabel} tick={MONO_STYLE} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={MONO_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
              <Area type="monotone" dataKey="spend" name="Spend" stroke="#c96b40" fill="url(#spendFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>

      <ChartFrame title="Income vs spend">
        {stats.incomeVsSpendMonthly.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.incomeVsSpendMonthly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 4" />
              <XAxis dataKey="month" tickFormatter={shortLabel} tick={MONO_STYLE} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tick={MONO_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11 }} />
              <Bar dataKey="income" name="Income" fill="#5c946e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="spend" name="Spend" fill="#c96b40" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>

      <ChartFrame title="Spend by category">
        {stats.byCategory.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={stats.byCategory} dataKey="total" nameKey="category" innerRadius={62} outerRadius={92} paddingAngle={2}>
                {stats.byCategory.map((entry, index) => <Cell key={entry.category} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
              <Legend wrapperStyle={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>

      <ChartFrame title="Top merchants">
        {stats.topMerchants.length === 0 ? (
          <ChartEmpty />
        ) : (
          <div className="divide-y divide-border/70">
            {stats.topMerchants.map((merchant, index) => (
              <div key={merchant.description} className="flex items-center gap-3 py-2.5">
                <span className="w-5 font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{merchant.description}</span>
                <span className="font-mono text-sm tabular-nums">{formatCurrency(merchant.total)}</span>
                <span className="w-12 text-right text-xs text-muted-foreground">{merchant.count}x</span>
              </div>
            ))}
          </div>
        )}
      </ChartFrame>
    </div>
  )
}

function ChartEmpty() {
  return <div className="flex h-full items-center justify-center border border-dashed border-border text-sm text-muted-foreground">No data in this range.</div>
}
