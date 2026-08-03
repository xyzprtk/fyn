"use client"

import { useQuery } from "@tanstack/react-query"

import type { StatsFilters, StatsResponse } from "@/lib/stats-types"

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

export function useStats(filters: StatsFilters) {
  return useQuery({
    queryKey: ["stats", filters.from ?? "", filters.to ?? "", filters.accountId ?? "all"],
    queryFn: async (): Promise<StatsResponse> => {
      const params = new URLSearchParams()
      if (filters.from) params.set("from", filters.from)
      if (filters.to) params.set("to", filters.to)
      if (filters.accountId !== undefined) params.set("account", String(filters.accountId))
      const response = await fetch(`/api/stats?${params.toString()}`)
      if (!response.ok) return parseError(response)
      return (await response.json()) as StatsResponse
    },
  })
}
