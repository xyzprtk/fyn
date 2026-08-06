# fyn

Local-only personal finance manager. Upload bank statements, review and edit the
parsed rows, then track spending over time on a private dashboard. Everything
lives on your machine — SQLite at `data/fyn.db`, uploads under `data/uploads/`.

## Stack

- **app/** — Next.js 15 (App Router, React 19, TypeScript strict), Tailwind CSS v4,
  shadcn/ui, TanStack Query, Recharts. Drizzle ORM over better-sqlite3.
- **parser/** — FastAPI sidecar on `:8000`. Stateless: bytes in, normalized JSON
  rows out. pdfplumber / pandas / openpyxl.
- **data/** — gitignored local state (database + uploaded statements).

The browser never talks to the parser or the database directly; everything goes
through Next.js route handlers.

## Requirements

- Node.js ≥ 20
- pnpm ≥ 9
- Python ≥ 3.11

## Quickstart

```sh
pnpm install   # root dev tooling (concurrently)
pnpm setup     # app deps, python venv, parser deps, db migrations + seed
pnpm dev       # web on :3000, parser on :8000
```

First run redirects to `/setup` to create a local password.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + parser together |
| `pnpm parser` | Run only the parser (uvicorn, reload) |
| `pnpm migrate` | Apply Drizzle migrations |
| `pnpm test` | Vitest (app) + pytest (parser) |
| `pnpm perf:fixture 50000 /tmp/fyn-perf.db` | Create an isolated synthetic ledger for performance checks |
| `FYN_COOKIE='fyn_session=...' pnpm perf:http` | Time authenticated pages and APIs |

Parser API docs (while running): http://localhost:8000/docs

## First-run checklist

1. Run `pnpm install && pnpm setup && pnpm dev`.
2. Open `http://localhost:3000` and set the local password.
3. Open Settings and add an account with its bank parser hint.
4. Upload a PDF, CSV, XLSX, or XLS statement and review the staging rows.
5. Exclude or correct flagged rows, then save the import.
6. Use Dashboard filters to inspect the period and account; use Transactions for edits.

The parser and database are both local services. The browser talks only to Next.js;
the raw statement is retained under `data/uploads/<YYYY-MM>/` after a successful save.

## Adding a bank in v2

Bank support is add-only. Add a profile in `parser/parsers/<bank>.py`, register it
in `parser/parsers/registry.py`, and add a small redacted fixture plus exact parser
tests under `parser/tests/fixtures/` and `parser/tests/`. Keep the normalized row
contract unchanged: the web app does not need a schema migration for a new bank.

Validate a new profile against a real redacted statement before shipping. If the
layout is uncertain, keep questionable rows in staging with flags rather than
silently dropping them.

## Troubleshooting

- **`better-sqlite3` build errors** — prebuilt binaries cover Node ≥ 20; if your
  platform misses one, run `pnpm --dir app rebuild better-sqlite3`.
- **Parser unreachable** — the web app expects uvicorn on `:8000`; `pnpm dev`
  starts both. The Upload page shows a retry action when it cannot reach the parser.
  Check `parser/.venv` exists (re-run `pnpm setup`).
- **Fresh local database** — remove `data/fyn.db`, then run `pnpm setup` to apply
  migrations and seed the default category rules again. Do not delete `data/uploads/`
  unless you also want to remove retained statements.
- **Testing an isolated database** — set `FYN_DB_PATH=/tmp/fyn.db` for setup and
  development. This keeps acceptance checks away from your normal local ledger.
- **Performance checks** — create a fixture with `pnpm perf:fixture 50000 /tmp/fyn-perf.db`,
  run the app with `FYN_DB_PATH=/tmp/fyn-perf.db`, and pass the generated cookie to
  `pnpm perf:http`. Compare `pnpm dev` with `pnpm build && pnpm start`; keep only one
  process listening on ports `3000` and `8000` during a run.
