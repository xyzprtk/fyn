"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type { CategoryRule, ImportHistoryItem } from "@/lib/settings-types"

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

export function useCategoryRules() {
  return useQuery({
    queryKey: ["category-rules"],
    queryFn: async (): Promise<CategoryRule[]> => {
      const response = await fetch("/api/category-rules")
      if (!response.ok) return parseError(response)
      return ((await response.json()) as { rules: CategoryRule[] }).rules
    },
    staleTime: 5 * 60_000,
  })
}

export function useCreateCategoryRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { keyword: string; category: string; priority?: number }): Promise<CategoryRule> => {
      const response = await fetch("/api/category-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) return parseError(response)
      return ((await response.json()) as { rule: CategoryRule }).rule
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["category-rules"] }),
  })
}

export function useUpdateCategoryRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: number; category: string; priority: number }): Promise<CategoryRule> => {
      const response = await fetch("/api/category-rules", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) return parseError(response)
      return ((await response.json()) as { rule: CategoryRule }).rule
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["category-rules"] })
      void queryClient.invalidateQueries({ queryKey: ["transactions"] })
    },
  })
}

export function useDeleteCategoryRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`/api/category-rules?id=${id}`, { method: "DELETE" })
      if (!response.ok) return parseError(response)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["category-rules"] })
    },
  })
}

export function useImportHistory() {
  return useQuery({
    queryKey: ["imports"],
    queryFn: async (): Promise<ImportHistoryItem[]> => {
      const response = await fetch("/api/imports")
      if (!response.ok) return parseError(response)
      return ((await response.json()) as { imports: ImportHistoryItem[] }).imports
    },
    staleTime: 60_000,
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }): Promise<void> => {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) return parseError(response)
    },
  })
}
