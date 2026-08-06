"use client"

import * as React from "react"
import { Moon, Sun } from "@phosphor-icons/react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const mounted = React.useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )

  return (
    <section>
      <h2 className="text-base font-semibold tracking-tight">Appearance</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose the surface that makes your ledger easiest to read.</p>
      <div className="mt-5 flex items-center gap-3">
        <Button type="button" variant="outline" disabled={!mounted} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          {mounted ? (theme === "dark" ? "Switch to light" : "Switch to dark") : "Loading theme..."}
        </Button>
        {mounted && <span className="text-xs text-muted-foreground">Currently {theme === "dark" ? "dark" : "light"}</span>}
      </div>
    </section>
  )
}
