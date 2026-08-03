"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight, FileArrowUp } from "@phosphor-icons/react"

import { StagingTable } from "@/components/import/staging-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAccounts } from "@/hooks/use-accounts"
import { useCommitImport, useParseStatement } from "@/hooks/use-import"
import { type Category } from "@/lib/categories"
import type { ParseResult, StagingRow } from "@/lib/import-types"
import { bankLabel } from "@/lib/banks"

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function stagingRows(result: ParseResult): StagingRow[] {
  return result.rows.map((row, index) => ({
    ...row,
    id: `${result.uploadId}-${index}`,
    included: !row.flags.some((flag) => flag === "bad_date" || flag === "zero_amount"),
    selected: false,
    category: null,
  }))
}

export default function UploadPage() {
  const accounts = useAccounts()
  const parseStatement = useParseStatement()
  const commitImport = useCommitImport()
  const [accountId, setAccountId] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [parseResult, setParseResult] = React.useState<ParseResult | null>(null)
  const [rows, setRows] = React.useState<StagingRow[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const selectedAccount = accounts.data?.find((account) => String(account.id) === accountId)

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null
    setFile(nextFile)
    setParseResult(null)
    setRows([])
    setSuccess(null)
    setError(null)
  }

  function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    if (!selectedAccount) {
      setError("Choose an account first.")
      return
    }
    if (!file) {
      setError("Choose a statement file.")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("The file must be 10 MB or smaller.")
      return
    }

    parseStatement.mutate(
      { accountId: selectedAccount.id, file },
      {
        onSuccess: (result) => {
          setParseResult(result)
          setRows(stagingRows(result))
        },
        onError: (parseError) => setError(parseError.message),
      },
    )
  }

  function updateRow(id: string, patch: Partial<StagingRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function updateAllSelected(selected: boolean) {
    setRows((current) => current.map((row) => ({ ...row, selected })))
  }

  function applyBulkCategory(category: Category | null) {
    setRows((current) =>
      current.map((row) => (row.selected ? { ...row, category } : row)),
    )
  }

  function commitRows() {
    if (!parseResult || !selectedAccount) return
    const included = rows.filter((row) => row.included)
    if (included.length === 0) {
      setError("Include at least one row before saving.")
      return
    }
    setError(null)
    setSuccess(null)
    commitImport.mutate(
      {
        accountId: selectedAccount.id,
        uploadId: parseResult.uploadId,
        originalFilename: parseResult.originalFilename,
        period: parseResult.period,
        rows: included.map((row) => ({
          date: row.date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          balance: row.balance,
          reference: row.reference,
          category: row.category,
        })),
      },
      {
        onSuccess: (result) => {
          setSuccess(
            `Saved ${result.rowsNew} new row${result.rowsNew === 1 ? "" : "s"}; ${result.rowsDupes} duplicate${result.rowsDupes === 1 ? "" : "s"} skipped.`,
          )
          setParseResult(null)
          setRows([])
        },
        onError: (importError) => setError(importError.message),
      },
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">Import / 01</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Upload statement</h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Parse a statement into a private staging area. Nothing reaches your ledger until you review and save it.
        </p>
      </header>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Start an import</CardTitle>
          <CardDescription>PDF, CSV, XLSX or XLS files up to 10 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleParse} className="grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="import-account">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="import-account" className="w-full">
                  <SelectValue placeholder={accounts.isPending ? "Loading accounts..." : "Choose an account"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.data?.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} ({bankLabel(account.bank)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAccount && (
                <p className="text-[11px] text-muted-foreground">Parser hint: {bankLabel(selectedAccount.bank)}</p>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="statement-file">Statement file</Label>
              <Input
                id="statement-file"
                type="file"
                accept=".pdf,.csv,.xlsx,.xls"
                onChange={handleFile}
              />
              {file && <p className="truncate text-[11px] text-muted-foreground">{file.name}</p>}
            </div>
            <Button type="submit" disabled={parseStatement.isPending || !selectedAccount}>
              <FileArrowUp size={16} />
              {parseStatement.isPending ? "Parsing..." : "Parse file"}
            </Button>
          </form>

          {!accounts.isPending && accounts.data?.length === 0 && (
            <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-5">
              <p className="text-sm text-muted-foreground">Add an account before importing its statement.</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">Open settings <ArrowRight size={14} /></Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {parseResult && (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Staging / review</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">{parseResult.originalFilename}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {parseResult.rows.length} parsed row{parseResult.rows.length === 1 ? "" : "s"}
                {parseResult.period ? ` from ${parseResult.period.from} to ${parseResult.period.to}` : ""}
              </p>
            </div>
            <Button onClick={commitRows} disabled={commitImport.isPending || rows.length === 0}>
              {commitImport.isPending ? "Saving..." : "Save included rows"}
            </Button>
          </div>
          {parseResult.warnings.length > 0 && (
            <div className="mt-4 border-l-2 border-warning bg-warning/5 px-3 py-2 text-sm text-warning">
              {parseResult.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}
          <StagingTable
            rows={rows}
            onChange={updateRow}
            onDelete={(id) => setRows((current) => current.filter((row) => row.id !== id))}
            onToggleAll={updateAllSelected}
            onBulkCategory={applyBulkCategory}
          />
        </div>
      )}

      {error && <p role="alert" className="border-l-2 border-destructive px-3 py-2 text-sm text-destructive">{error}</p>}
      {success && (
        <p role="status" className="border-l-2 border-success px-3 py-2 text-sm text-success">
          {success} <Link className="underline underline-offset-4" href="/transactions">View transactions</Link>
        </p>
      )}
    </div>
  )
}
