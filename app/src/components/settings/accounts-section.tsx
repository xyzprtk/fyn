"use client"

import * as React from "react"
import { Check, PencilSimple, Trash, X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionButton } from "@/components/ui/motion-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useUpdateAccount,
} from "@/hooks/use-accounts"
import { BANKS, bankLabel, type BankKey } from "@/lib/banks"
import type { Account } from "@/server/queries"

export function AccountsSection() {
  const accounts = useAccounts()
  const createAccount = useCreateAccount()

  const [name, setName] = React.useState("")
  const [bank, setBank] = React.useState<BankKey | "">("")
  const [accountNumber, setAccountNumber] = React.useState("")
  const [formError, setFormError] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!bank) {
      setFormError("Pick a bank.")
      return
    }
    setFormError(null)
    createAccount.mutate(
      {
        name: name.trim(),
        bank,
        ...(accountNumber.trim() ? { accountNumber: accountNumber.trim() } : {}),
      },
      {
        onSuccess: () => {
          setName("")
          setBank("")
          setAccountNumber("")
        },
        onError: (error) => setFormError(error.message),
      },
    )
  }

  return (
    <section className="max-w-2xl">
      <h2 className="text-base font-semibold tracking-tight">Accounts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The bank accounts you import statements for. Deleting an account also
        deletes its transactions and import history.
      </p>

      <div className="mt-5 divide-y rounded-lg border">
        {accounts.isPending && (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Loading accounts…
          </p>
        )}
        {accounts.isError && (
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm text-destructive">
              Could not load accounts.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void accounts.refetch()}
            >
              Retry
            </Button>
          </div>
        )}
        {accounts.data?.length === 0 && (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            No accounts yet — add your first one below.
          </p>
        )}
        {accounts.data?.map((account) => (
          <AccountRow key={account.id} account={account} />
        ))}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_140px_auto] sm:items-end"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="account-name">Name</Label>
          <Input
            id="account-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Federal Savings"
            required
            maxLength={80}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="account-bank">Bank</Label>
          <Select
            value={bank}
            onValueChange={(value) => setBank(value as BankKey)}
          >
            <SelectTrigger id="account-bank" className="w-full">
              <SelectValue placeholder="Pick a bank" />
            </SelectTrigger>
            <SelectContent>
              {BANKS.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="account-number">Number</Label>
          <Input
            id="account-number"
            value={accountNumber}
            onChange={(event) => setAccountNumber(event.target.value)}
            placeholder="Last 4 digits"
            maxLength={24}
          />
        </div>
        <MotionButton type="submit" disabled={createAccount.isPending}>
          {createAccount.isPending ? "Adding…" : "Add account"}
        </MotionButton>
        {formError && (
          <p role="alert" className="text-sm text-destructive sm:col-span-4">
            {formError}
          </p>
        )}
      </form>
    </section>
  )
}

function AccountRow({ account }: { account: Account }) {
  const deleteAccount = useDeleteAccount()
  const updateAccount = useUpdateAccount()
  const [confirming, setConfirming] = React.useState(false)
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(account.name)
  const [bank, setBank] = React.useState<BankKey>(account.bank as BankKey)
  const [accountNumber, setAccountNumber] = React.useState(account.accountNumber ?? "")
  const [error, setError] = React.useState<string | null>(null)

  if (editing) {
    return (
      <div className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_150px_130px_auto] sm:items-center">
        <Input value={name} aria-label="Edit account name" onChange={(event) => setName(event.target.value)} maxLength={80} />
        <Select value={bank} onValueChange={(value) => setBank(value as BankKey)}>
          <SelectTrigger aria-label="Edit account bank" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{BANKS.map((option) => <SelectItem key={option.key} value={option.key}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={accountNumber} aria-label="Edit account number" onChange={(event) => setAccountNumber(event.target.value)} maxLength={24} placeholder="Last 4 digits" />
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="icon-sm"
            aria-label="Save account"
            disabled={updateAccount.isPending}
            onClick={() => {
              setError(null)
              updateAccount.mutate(
                { id: account.id, name: name.trim(), bank, accountNumber: accountNumber.trim() },
                { onSuccess: () => setEditing(false), onError: (value) => setError(value.message) },
              )
            }}
          >
            <Check size={15} />
          </Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel account editing" onClick={() => setEditing(false)}><X size={15} /></Button>
        </div>
        {error && <p role="alert" className="text-xs text-destructive sm:col-span-4">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{account.name}</p>
        <p className="text-xs text-muted-foreground">
          {bankLabel(account.bank)}
          {account.accountNumber ? ` · ${account.accountNumber}` : ""}
        </p>
      </div>
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${account.name}`} onClick={() => setEditing(true)}>
        <PencilSimple size={15} />
      </Button>
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Delete?</span>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteAccount.isPending}
            onClick={() => deleteAccount.mutate(account.id)}
          >
            {deleteAccount.isPending ? "Deleting…" : "Yes, delete"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete ${account.name}`}
          onClick={() => setConfirming(true)}
        >
          <Trash size={16} />
        </Button>
      )}
    </div>
  )
}
