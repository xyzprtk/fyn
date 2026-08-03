"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { ImportRowInput, ImportResult } from "@/server/imports"
import type { ParseResult } from "@/lib/import-types"

type ParseInput = {
  accountId: number
  file: File
  bank?: string
}

type CommitInput = {
  accountId: number
  uploadId: string
  originalFilename: string
  period: ParseResult["period"]
  rows: ImportRowInput[]
}

async function requestError(response: Response): Promise<never> {
  let message = `Request failed (${response.status})`
  try {
    const data: unknown = await response.json()
    if (data && typeof data === "object" && "error" in data) {
      const error = (data as { error: unknown }).error
      if (typeof error === "string") message = error
    }
    if (data && typeof data === "object" && "reason" in data) {
      const reason = (data as { reason: unknown }).reason
      if (typeof reason === "string") message = `${message}: ${reason}`
    }
  } catch {
    // Keep the status-based message.
  }
  throw new Error(message)
}

export function useParseStatement() {
  return useMutation({
    mutationFn: async ({ accountId, file, bank }: ParseInput): Promise<ParseResult> => {
      const form = new FormData()
      form.append("accountId", String(accountId))
      form.append("file", file)
      if (bank) form.append("bank", bank)
      let response: Response
      try {
        response = await fetch("/api/parse", {
          method: "POST",
          body: form,
        })
      } catch {
        throw new Error("parser_unreachable")
      }
      if (!response.ok) {
        return requestError(response)
      }
      return (await response.json()) as ParseResult
    },
  })
}

export function useCommitImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CommitInput): Promise<ImportResult> => {
      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!response.ok) return requestError(response)
      return (await response.json()) as ImportResult
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["transactions"] })
      void queryClient.invalidateQueries({ queryKey: ["stats"] })
    },
  })
}
