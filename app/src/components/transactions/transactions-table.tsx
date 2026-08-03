"use client"

import * as React from "react"
import { Check, PencilSimple, X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORIES } from "@/lib/categories"
import { formatCurrency } from "@/lib/format"
import type { TransactionListRow } from "@/lib/transaction-types"

type TransactionsTableProps = {
  rows: TransactionListRow[]
  onSave: (patch: { id: number; description?: string; amount?: number; category?: string }, previous: TransactionListRow) => void
  savingId?: number
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value))
}

function EditRow({
  row,
  onSave,
  onCancel,
  saving,
}: {
  row: TransactionListRow
  onSave: TransactionsTableProps["onSave"]
  onCancel: () => void
  saving: boolean
}) {
  const [description, setDescription] = React.useState(row.description)
  const [amount, setAmount] = React.useState(String(row.amount))
  const [category, setCategory] = React.useState(row.category)
  const dirty = description !== row.description || amount !== String(row.amount) || category !== row.category

  function save() {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount)) return
    const patch: { id: number; description?: string; amount?: number; category?: string } = { id: row.id }
    if (description !== row.description) patch.description = description
    if (parsedAmount !== row.amount) patch.amount = parsedAmount
    if (category !== row.category) patch.category = category
    onSave(patch, row)
  }

  return (
    <tr className="bg-muted/30">
      <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{dateLabel(row.date)}</td>
      <td className="px-3 py-2">
        <Input value={description} aria-label="Edit description" onChange={(event) => setDescription(event.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Input type="number" step="0.01" value={amount} aria-label="Edit amount" className="font-mono tabular-nums" onChange={(event) => setAmount(event.target.value)} />
      </td>
      <td className="px-3 py-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-32" aria-label="Edit category"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </td>
      <td className="px-3 py-3 text-muted-foreground">{row.accountName}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex justify-end gap-1">
          <Button type="button" size="icon-sm" aria-label="Save transaction" disabled={!dirty || saving} onClick={save}>
            <Check size={15} />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel editing" onClick={onCancel}>
            <X size={15} />
          </Button>
        </div>
      </td>
    </tr>
  )
}

export function TransactionsTable({ rows, onSave, savingId }: TransactionsTableProps) {
  const [editingId, setEditingId] = React.useState<number | null>(null)

  return (
    <div className="overflow-x-auto border-y border-border">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-3 font-medium">Date</th>
            <th className="px-3 py-3 font-medium">Description</th>
            <th className="px-3 py-3 font-medium">Amount</th>
            <th className="px-3 py-3 font-medium">Category</th>
            <th className="px-3 py-3 font-medium">Account</th>
            <th className="px-3 py-3 text-right font-medium">Edit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((row) => editingId === row.id ? (
            <EditRow
              key={row.id}
              row={row}
              saving={savingId === row.id}
              onSave={(patch, previous) => onSave(patch, previous)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{dateLabel(row.date)}</td>
              <td className="max-w-[360px] truncate px-3 py-3">{row.description || "(no description)"}</td>
              <td className={`whitespace-nowrap px-3 py-3 font-mono tabular-nums ${row.type === "credit" ? "text-success" : ""}`}>
                {row.type === "credit" ? "+" : "-"}{formatCurrency(Math.abs(row.amount))}
              </td>
              <td className="px-3 py-3 text-muted-foreground">{row.category}</td>
              <td className="px-3 py-3 text-muted-foreground">{row.accountName}</td>
              <td className="px-3 py-2 text-right">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${row.description || "transaction"}`} onClick={() => setEditingId(row.id)}>
                  <PencilSimple size={15} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
