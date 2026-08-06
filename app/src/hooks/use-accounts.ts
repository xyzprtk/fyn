"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { Account } from "@/server/queries"

type CreateAccountInput = {
  name: string
  bank: string
  accountNumber?: string
}

type UpdateAccountInput = CreateAccountInput & { id: number }
type AccountMutationInput = CreateAccountInput | UpdateAccountInput

async function parseError(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`
  try {
    const data: unknown = await res.json()
    if (data && typeof data === "object" && "error" in data) {
      const { error } = data as { error: unknown }
      if (typeof error === "string") message = error
    }
  } catch {
    // keep the status-based message
  }
  throw new Error(message)
}

async function saveAccount(
  method: "POST" | "PATCH",
  input: AccountMutationInput,
): Promise<Account> {
  const res = await fetch("/api/accounts", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) return parseError(res)
  const data = (await res.json()) as { account: Account }
  return data.account
}

export function useAccounts(initialData?: Account[]) {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async (): Promise<Account[]> => {
      const res = await fetch("/api/accounts")
      if (!res.ok) return parseError(res)
      const data = (await res.json()) as { accounts: Account[] }
      return data.accounts
    },
    initialData,
    staleTime: 5 * 60_000,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) => saveAccount("POST", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" })
      if (!res.ok) return parseError(res)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateAccountInput) => saveAccount("PATCH", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    },
  })
}
