"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionButton } from "@/components/ui/motion-button"
import { errorCode } from "@/server/http"

function errorMessage(code: string | null): string {
  switch (code) {
    case "invalid_password":
      return "Incorrect credentials."
    case "password_required":
      return "Enter your password."
    case "password_too_short":
      return "Use at least 8 characters."
    case "password_already_set":
      return "Password is already set — log in instead."
    case "password_not_set":
      return "No password yet — create one first."
    default:
      return "Something went wrong. Try again."
  }
}

export function PasswordCard({ mode }: { mode: "login" | "setup" }) {
  const router = useRouter()
  const isSetup = mode === "setup"
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const password = (form.elements.namedItem("password") as HTMLInputElement).value

    if (isSetup) {
      const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value
      if (password !== confirm) {
        setError("Passwords do not match.")
        return
      }
    }

    setPending(true)
    setError(null)
    try {
      const res = await fetch(isSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        const code = errorCode(await res.json().catch(() => null))
        setError(errorMessage(code))
        return
      }
      router.replace("/dashboard")
      router.refresh()
    } catch {
      setError("Could not reach the server. Try again.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{isSetup ? "Set a password" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isSetup
            ? "One local password protects this ledger. Minimum 8 characters."
            : "Enter your password to open your ledger."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoFocus
              autoComplete={isSetup ? "new-password" : "current-password"}
            />
          </div>
          {isSetup && (
            <div className="grid gap-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <MotionButton type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait…" : isSetup ? "Create password" : "Log in"}
          </MotionButton>
          {isSetup && (
            <p className="text-center text-xs text-muted-foreground">
              Already set up?{" "}
              <Link
                href="/"
                className="text-primary underline-offset-4 hover:underline"
              >
                Log in
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
