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

export function PasswordCard({ mode }: { mode: "login" | "setup" }) {
  const router = useRouter()
  const isSetup = mode === "setup"

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // TODO(phase-2): call /api/auth/login or /api/auth/setup, then redirect
    router.push("/dashboard")
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
          <MotionButton type="submit" className="w-full">
            {isSetup ? "Create password" : "Log in"}
          </MotionButton>
          <p className="text-center text-xs text-muted-foreground">
            {isSetup ? (
              <>
                Already set up?{" "}
                <Link
                  href="/"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Log in
                </Link>
              </>
            ) : (
              <>
                First run?{" "}
                <Link
                  href="/setup"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Set a password
                </Link>
              </>
            )}
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
