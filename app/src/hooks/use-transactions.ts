"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  TransactionFilters,
  TransactionListResponse,
  TransactionListRow,
} from "@/lib/transaction-types"

type TransactionPatch = {
  id: number
  description?: string
  amount?: number
  category?: string
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed (${response.status})`
  try {
    const data: unknown = await response.json()
    if (data && typeof data === "object" && "error" in data) {
      const error = (data as { error: unknown }).error
      if (typeof error === "string") message = error
    }
  } catch {
    // Keep the status-based message.
  }
  throw new Error(message)
}

function paramsFor(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  if (filters.page) params.set("page", String(filters.page))
  if (filters.accountId !== undefined) params.set("account", String(filters.accountId))
  if (filters.category) params.set("category", filters.category)
  if (filters.type) params.set("type", filters.type)
  if (filters.search) params.set("search", filters.search)
  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  return params.toString()
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async (): Promise<TransactionListResponse> => {
      const response = await fetch(`/api/transactions?${paramsFor(filters)}`)
      if (!response.ok) return parseError(response)
      return (await response.json()) as TransactionListResponse
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: TransactionPatch): Promise<TransactionListRow> => {
      const response = await fetch("/api/transactions", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!response.ok) return parseError(response)
      const data = (await response.json()) as { transaction: TransactionListRow }
      return data.transaction
    },
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] })
      const previous = queryClient.getQueriesData<TransactionListResponse>({ queryKey: ["transactions"] })
      queryClient.setQueriesData<TransactionListResponse>({ queryKey: ["transactions"] }, (data) => {
        if (!data) return data
        return {
          ...data,
          rows: data.rows.map((row) => row.id !== patch.id ? row : {
            ...row,
            ...(patch.description === undefined ? {} : { description: patch.description }),
            ...(patch.amount === undefined ? {} : { amount: patch.amount, type: patch.amount < 0 ? "debit" : "credit" }),
            ...(patch.category === undefined ? {} : { category: patch.category }),
            edited: true,
          }),
        }
      })
      return { previous }
    },
    onError: (_error, _patch, context) => {
      for (const [queryKey, data] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, data)
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueriesData<TransactionListResponse>({ queryKey: ["transactions"] }, (data) => {
        if (!data) return data
        return { ...data, rows: data.rows.map((row) => row.id === updated.id ? updated : row) }
      })
      void queryClient.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}

export function useCreateCategoryRule() {
  return useMutation({
    mutationFn: async (input: { keyword: string; category: string }): Promise<void> => {
      const response = await fetch("/api/category-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) return parseError(response)
    },
  })
}
