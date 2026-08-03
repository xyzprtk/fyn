"use client"

import * as React from "react"
import { Trash, WarningCircle } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORIES, type Category } from "@/lib/categories"
import type { StagingRow } from "@/lib/import-types"

type StagingTableProps = {
  rows: StagingRow[]
  onChange: (id: string, patch: Partial<StagingRow>) => void
  onDelete: (id: string) => void
  onToggleAll: (selected: boolean) => void
  onBulkCategory: (category: Category | null) => void
}

const FLAG_LABELS: Record<string, string> = {
  bad_date: "Bad date",
  zero_amount: "Zero amount",
  empty_description: "Empty description",
  balance_mismatch: "Balance mismatch",
  possible_artifact: "Possible artifact",
}

export function StagingTable({
  rows,
  onChange,
  onDelete,
  onToggleAll,
  onBulkCategory,
}: StagingTableProps) {
  const [bulkCategory, setBulkCategory] = React.useState("auto")
  const allSelected = rows.length > 0 && rows.every((row) => row.selected)
  const includedCount = rows.filter((row) => row.included).length
  const selectedCount = rows.filter((row) => row.selected).length

  function applyBulkCategory() {
    onBulkCategory(bulkCategory === "auto" ? null : (bulkCategory as Category))
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Review rows</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {includedCount} of {rows.length} rows included
            {selectedCount > 0 ? ` - ${selectedCount} selected` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={bulkCategory} onValueChange={setBulkCategory}>
            <SelectTrigger className="w-36" aria-label="Bulk category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto category</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={selectedCount === 0}
            onClick={applyBulkCategory}
          >
            Apply to selected
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2 font-medium">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  checked={allSelected}
                  onChange={(event) => onToggleAll(event.target.checked)}
                />
              </th>
              <th className="w-16 px-2 py-2 font-medium">Include</th>
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="min-w-64 px-2 py-2 font-medium">Description</th>
              <th className="w-28 px-2 py-2 font-medium">Amount</th>
              <th className="w-28 px-2 py-2 font-medium">Type</th>
              <th className="w-28 px-2 py-2 font-medium">Balance</th>
              <th className="w-36 px-2 py-2 font-medium">Category</th>
              <th className="min-w-36 px-2 py-2 font-medium">Reference</th>
              <th className="min-w-32 px-2 py-2 font-medium">Flags</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {rows.map((row) => (
              <StagingTableRow
                key={row.id}
                row={row}
                onChange={onChange}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StagingTableRow({
  row,
  onChange,
  onDelete,
}: {
  row: StagingRow
  onChange: (id: string, patch: Partial<StagingRow>) => void
  onDelete: (id: string) => void
}) {
  const flagged = row.flags.length > 0

  return (
    <tr className={flagged ? "border-l-2 border-l-warning bg-warning/5" : ""}>
      <td className="px-3 py-2 align-top">
        <input
          type="checkbox"
          aria-label={`Select ${row.description || "row"}`}
          checked={row.selected}
          onChange={(event) => onChange(row.id, { selected: event.target.checked })}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <input
          type="checkbox"
          aria-label={`Include ${row.description || "row"}`}
          checked={row.included}
          onChange={(event) => onChange(row.id, { included: event.target.checked })}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          type="date"
          value={row.date}
          aria-label="Transaction date"
          className="w-32 text-xs"
          onChange={(event) => onChange(row.id, { date: event.target.value })}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          value={row.description}
          aria-label="Transaction description"
          className="min-w-60 text-xs"
          onChange={(event) => onChange(row.id, { description: event.target.value })}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          type="number"
          step="0.01"
          value={row.amount}
          aria-label="Transaction amount"
          className="w-28 font-mono text-xs tabular-nums"
          onChange={(event) => onChange(row.id, { amount: Number(event.target.value) })}
        />
      </td>
      <td className="px-2 py-2 align-top">
        <Select
          value={row.type}
          onValueChange={(value) => onChange(row.id, { type: value as StagingRow["type"] })}
        >
          <SelectTrigger className="w-26" aria-label="Transaction type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="debit">Debit</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          type="number"
          step="0.01"
          value={row.balance ?? ""}
          aria-label="Running balance"
          className="w-28 font-mono text-xs tabular-nums"
          onChange={(event) =>
            onChange(row.id, {
              balance: event.target.value === "" ? null : Number(event.target.value),
            })
          }
        />
      </td>
      <td className="px-2 py-2 align-top">
        <Select
          value={row.category ?? "auto"}
          onValueChange={(value) =>
            onChange(row.id, { category: value === "auto" ? null : (value as Category) })
          }
        >
          <SelectTrigger className="w-34" aria-label="Transaction category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-2 py-2 align-top">
        <Input
          value={row.reference ?? ""}
          aria-label="Transaction reference"
          className="min-w-32 text-xs"
          onChange={(event) => onChange(row.id, { reference: event.target.value || null })}
        />
      </td>
      <td className="px-2 py-2 align-top">
        {flagged ? (
          <div className="flex flex-wrap gap-1">
            {row.flags.map((flag) => (
              <span
                key={flag}
                title={FLAG_LABELS[flag] ?? flag}
                className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[10px] text-warning"
              >
                <WarningCircle size={12} />
                {FLAG_LABELS[flag] ?? flag}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-2 py-2 align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={`Delete ${row.description || "row"}`}
          onClick={() => onDelete(row.id)}
        >
          <Trash size={14} />
        </Button>
      </td>
    </tr>
  )
}
