"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useChangePassword } from "@/hooks/use-settings"

export function SecuritySection() {
  const changePassword = useChangePassword()
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const currentPassword = (form.elements.namedItem("current-password") as HTMLInputElement).value
    const newPassword = (form.elements.namedItem("new-password") as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem("confirm-password") as HTMLInputElement).value
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.")
      return
    }
    setError(null)
    setSuccess(false)
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset()
          setSuccess(true)
        },
        onError: (value) => setError(value.message),
      },
    )
  }

  return (
    <section className="max-w-xl">
      <h2 className="text-base font-semibold tracking-tight">Password</h2>
      <p className="mt-1 text-sm text-muted-foreground">Change the local password protecting this ledger.</p>
      <form onSubmit={submit} className="mt-5 grid gap-3 sm:max-w-sm">
        <div className="grid gap-1.5"><Label htmlFor="current-password">Current password</Label><Input id="current-password" name="current-password" type="password" autoComplete="current-password" required /></div>
        <div className="grid gap-1.5"><Label htmlFor="new-password">New password</Label><Input id="new-password" name="new-password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <div className="grid gap-1.5"><Label htmlFor="confirm-password">Confirm new password</Label><Input id="confirm-password" name="confirm-password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <Button type="submit" disabled={changePassword.isPending}>{changePassword.isPending ? "Updating..." : "Change password"}</Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {success && <p role="status" className="text-sm text-success">Password updated.</p>}
      </form>
    </section>
  )
}
