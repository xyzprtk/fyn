"use client"

import * as React from "react"
import { Check, PencilSimple, Trash, X } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MotionButton } from "@/components/ui/motion-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CATEGORIES } from "@/lib/categories"
import type { CategoryRule } from "@/lib/settings-types"
import { useCategoryRules, useCreateCategoryRule, useDeleteCategoryRule, useUpdateCategoryRule } from "@/hooks/use-settings"

export function RulesSection() {
  const rules = useCategoryRules()
  const createRule = useCreateCategoryRule()
  const [keyword, setKeyword] = React.useState("")
  const [category, setCategory] = React.useState("Other")
  const [priority, setPriority] = React.useState("0")
  const [error, setError] = React.useState<string | null>(null)

  function addRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    createRule.mutate(
      { keyword: keyword.trim(), category, priority: Number(priority) || 0 },
      {
        onSuccess: () => {
          setKeyword("")
          setCategory("Other")
          setPriority("0")
        },
        onError: (value) => setError(value.message),
      },
    )
  }

  return (
    <section className="max-w-3xl">
      <div>
        <h2 className="text-base font-semibold tracking-tight">Category rules</h2>
        <p className="mt-1 text-sm text-muted-foreground">Keywords are matched as case-insensitive substrings. Higher priority wins.</p>
      </div>
      <div className="mt-5 overflow-hidden rounded-lg border">
        {rules.isPending && <div className="space-y-2 px-4 py-4"><div className="h-4 w-48 animate-pulse rounded bg-muted" /><div className="h-4 w-72 animate-pulse rounded bg-muted" /></div>}
        {rules.isError && <div className="flex items-center justify-between gap-4 px-4 py-3"><p className="text-sm text-destructive">Could not load rules.</p><Button variant="outline" size="sm" onClick={() => void rules.refetch()}>Retry</Button></div>}
        {rules.data?.length === 0 && <p className="px-4 py-4 text-sm text-muted-foreground">No category rules yet.</p>}
        {rules.data?.map((rule) => <RuleRow key={rule.id} rule={rule} />)}
      </div>
      <form onSubmit={addRule} className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px_100px_auto] sm:items-end">
        <div className="grid gap-1.5"><Label htmlFor="rule-keyword">Keyword</Label><Input id="rule-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="swiggy" maxLength={80} required /></div>
        <div className="grid gap-1.5"><Label htmlFor="rule-category">Category</Label><CategorySelect id="rule-category" value={category} onChange={setCategory} /></div>
        <div className="grid gap-1.5"><Label htmlFor="rule-priority">Priority</Label><Input id="rule-priority" type="number" value={priority} onChange={(event) => setPriority(event.target.value)} /></div>
        <MotionButton type="submit" disabled={createRule.isPending}>{createRule.isPending ? "Adding..." : "Add rule"}</MotionButton>
        {error && <p role="alert" className="text-sm text-destructive sm:col-span-4">{error}</p>}
      </form>
    </section>
  )
}

function CategorySelect({ id, value, onChange }: { id?: string; value: string; onChange: (value: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
    </Select>
  )
}

function RuleRow({ rule }: { rule: CategoryRule }) {
  const updateRule = useUpdateCategoryRule()
  const deleteRule = useDeleteCategoryRule()
  const [editing, setEditing] = React.useState(false)
  const [category, setCategory] = React.useState(rule.category)
  const [priority, setPriority] = React.useState(String(rule.priority))
  const [error, setError] = React.useState<string | null>(null)

  if (editing) {
    return (
      <div className="grid gap-2 border-b border-border/70 px-4 py-3 last:border-0 sm:grid-cols-[1fr_150px_100px_auto] sm:items-center">
        <span className="truncate text-sm font-medium">{rule.keyword}</span>
        <CategorySelect value={category} onChange={setCategory} />
        <Input type="number" value={priority} aria-label={`Priority for ${rule.keyword}`} onChange={(event) => setPriority(event.target.value)} />
        <div className="flex justify-end gap-1"><Button type="button" size="icon-sm" aria-label={`Save ${rule.keyword}`} disabled={updateRule.isPending} onClick={() => { setError(null); updateRule.mutate({ id: rule.id, category, priority: Number(priority) || 0 }, { onSuccess: () => setEditing(false), onError: (value) => setError(value.message) }) }}><Check size={15} /></Button><Button type="button" variant="ghost" size="icon-sm" aria-label={`Cancel editing ${rule.keyword}`} onClick={() => setEditing(false)}><X size={15} /></Button></div>
        {error && <p role="alert" className="text-xs text-destructive sm:col-span-4">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3 last:border-0">
      <span className="min-w-0 flex-1 truncate font-mono text-sm">{rule.keyword}</span>
      <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{rule.category}</span>
      <span className="w-10 text-right font-mono text-xs text-muted-foreground">{rule.priority}</span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${rule.keyword}`} onClick={() => setEditing(true)}><PencilSimple size={15} /></Button>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${rule.keyword}`} disabled={deleteRule.isPending} onClick={() => { if (window.confirm(`Delete the ${rule.keyword} rule?`)) deleteRule.mutate(rule.id) }}><Trash size={15} /></Button>
    </div>
  )
}
