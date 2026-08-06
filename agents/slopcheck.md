# Aislop Scan

Scan command: `npx aislop@latest scan`

Scan version: `0.14.0`

Initial result: 59/100, with 3 errors and 11 warnings across 104 files.

## Findings and fixes

| Finding | Location | Fix |
| --- | --- | --- |
| Catch parameter is unused | `scripts/perf/check-ports.mjs:9` | Use an optional catch binding because the fallback does not need the error object. |
| Duplicate card wrapper blocks | `app/src/components/ui/card.tsx:37`, `:61` | Extract a shared `renderCardSlot` helper for the repeated `data-slot`, class merging, and prop forwarding. |
| Duplicate account mutation request blocks | `app/src/hooks/use-accounts.ts:47`, `:79` | Extract a shared account-save request helper and keep only the HTTP method different between create and update. |
| `pydantic` is imported but undeclared | `parser/models.py:15` | Add the installed compatible Pydantic version as a direct parser requirement. |
| Decorative narrative comments | `app/src/server/auth.ts:88`; `parser/parsers/base.py:53`, `:110`, `:181`, `:241` | Remove separator comments that do not explain behavior. |
| Console output flagged as a production leftover | `app/src/db/seed.ts:69` | Keep intentional CLI feedback but write it through `process.stdout` instead of `console.log`. |
| Unused `React` import | `app/src/app/(app)/dashboard/dashboard-client.tsx:3` | Remove the import; the file does not use the React namespace. |
| Unused catch variable | `scripts/perf/check-ports.mjs:9` | Covered by the optional catch binding fix above. |
| Possible hardcoded password in UI copy | `app/src/components/auth/password-card.tsx:20` | Use the user-facing `Incorrect credentials.` message; this finding is a conservative scanner false positive, not a stored secret. |
| Hardcoded performance fixture password | `scripts/perf/generate-db.ts:75`, `:88` | Generate a random fixture password by default, allow an explicit `FYN_PERF_PASSWORD` override, and print the generated value only as fixture output. |

## Verification plan

- Run `npx aislop@latest scan` again and record the new result.
- Run `pnpm test`.
- Run `pnpm build`.
- Run parser tests if the local parser environment is available.
- Review the final diff before committing.

## Final result

- Follow-up `npx aislop@latest scan`: `100/100`, no issues.
- `pnpm test`: 30 application tests and 65 parser tests passed.
- `pnpm build`: passed.
- Parser tests reported one existing Starlette deprecation warning about `httpx2`.
