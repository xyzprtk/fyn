# fyn

Local-only personal finance manager. Upload bank statements, review and edit the
parsed rows, then track spending over time on a private dashboard. Everything
lives on your machine — SQLite at `data/fyn.db`, uploads under `data/uploads/`.

## Stack

- **app/** — Next.js 15 (App Router, React 19, TypeScript strict), Tailwind CSS v4,
  shadcn/ui, TanStack Query, Recharts. Drizzle ORM over better-sqlite3.
- **parser/** — FastAPI sidecar on `:8000`. Stateless: bytes in, normalized JSON
  rows out. pdfplumber / openpyxl.
- **data/** — gitignored local state (database + uploaded statements).

The browser never talks to the parser or the database directly; everything goes
through Next.js route handlers.

## Requirements

- Node.js ≥ 20
- pnpm ≥ 9
- Python ≥ 3.11

## Quickstart

```sh
pnpm run dev:setup  # install everything, prepare the database, then start both services
```

For later starts, use `pnpm dev` directly. It keeps the normal development restart
fast without reinstalling dependencies.

First run redirects to `/setup` to create a local password.

## Useful commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run web + parser together after setup |
| `pnpm run dev:setup` | Install dependencies, prepare the database, and start web + parser |
| `pnpm parser` | Run only the parser (uvicorn, reload) |
| `pnpm migrate` | Apply Drizzle migrations |
| `pnpm test` | Vitest (app) + pytest (parser) |
| `pnpm perf:fixture 50000 /tmp/fyn-perf.db` | Create an isolated synthetic ledger for performance checks |
| `FYN_COOKIE='fyn_session=...' pnpm perf:http` | Time authenticated pages and APIs |
| `pnpm perf:parser` | Benchmark representative CSV, XLSX, and multi-page PDF extraction |
| `pnpm perf:themes` | Smoke-check light/dark design token coverage |
| `pnpm perf:ports` | Report whether ports `3000` and `8000` are free or owned |

Parser API docs (while running): http://localhost:8000/docs

## First-run checklist

1. Run `pnpm run dev:setup`.
2. Open the printed URL (e.g. `http://localhost:3000`) and set the local password.
   The dev server picks the first free port from 3000 upward and prints it on
   startup (`fyn web → http://localhost:<port>`). Set `PORT` to pin one.
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
  Check `parser/.venv` exists (re-run `pnpm run setup`). Note that bare `pnpm setup`
  invokes pnpm's own environment command, so use the explicit `pnpm run setup` form.
- **Fresh local database** — remove `data/fyn.db`, then run `pnpm run setup` to apply
  migrations and seed the default category rules again. Do not delete `data/uploads/`
  unless you also want to remove retained statements.
- **Testing an isolated database** — set `FYN_DB_PATH=/tmp/fyn.db` for setup and
  development. This keeps acceptance checks away from your normal local ledger.
- **Performance checks** — create a fixture with `pnpm perf:fixture 50000 /tmp/fyn-perf.db`,
  run the app with `FYN_DB_PATH=/tmp/fyn-perf.db`, and pass the generated cookie to
  `pnpm perf:http`. Compare `pnpm dev` with `pnpm build && pnpm start`; keep only one
  process listening on ports `3000` and `8000` during a run.
- **Strict process check** — while both services are running, use
  `FYN_REQUIRE_SERVICES=1 pnpm perf:ports`. Uvicorn reload may show its parent and
  worker on the same listening socket; that is expected. Multiple listening sockets
  on the same port indicate a stale or duplicate server.

## Performance Verification

Use an isolated database so benchmark data never touches the normal ledger:

```sh
pnpm install --frozen-lockfile
pnpm run setup
pnpm perf:themes
pnpm perf:parser
pnpm perf:fixture 10000 /tmp/fyn-perf-10k.db
pnpm perf:fixture 50000 /tmp/fyn-perf-50k.db
pnpm perf:fixture 100000 /tmp/fyn-perf-100k.db
pnpm perf:explain /tmp/fyn-perf-100k.db
```

For each fixture, start exactly one web server with `FYN_DB_PATH`, capture the
fixture cookie printed by `perf:fixture`, and run:

```sh
FYN_COOKIE='fyn_session=<fixture-token>' pnpm perf:http
```

Run once under `pnpm dev` for development overhead and once after `pnpm build`
with `pnpm start` for application timings. `pnpm perf:http` reports cold and
warm server timings, response status, and HTML/JSON bytes. Browser hydration,
chart loading, and long tasks should be checked in DevTools when a UI regression
is suspected.

## Optimization Notes

This branch contains a measured performance pass. The changes target the parts
that made the app feel slow without replacing SQLite, Drizzle, Recharts, or the
synchronous parser flow.

### Database and API reads

- Added `tx_date_idx` for all-account date range queries.
- Replaced the old account/date index with `tx_account_date_id_idx` for stable account pagination.
- Added `tx_account_category_date_idx` for filtered transaction views.
- Rewrote dashboard statistics to use focused SQL aggregates instead of loading every matching transaction into JavaScript.
- Reused monthly aggregate results for long date ranges instead of scanning the same range twice.
- Kept the API response shapes, transaction hashes, import deduplication, and financial calculations unchanged.

### Dashboard and client behavior

- Server-rendered the initial dashboard accounts and statistics so summary cards do not wait for a duplicate client fetch.
- Deferred Recharts until after the summary content loads, with reserved chart skeleton space.
- Increased cache lifetimes for stable account, rule, and import metadata.
- Disabled unnecessary refetches when the browser window regains focus.
- Added optimistic transaction edits with rollback on failure and immediate stats invalidation.

### Statement parsing

- PDF table-backed statements no longer run a second full-page text extraction pass.
- XLSX files use openpyxl read-only iteration instead of materializing a pandas DataFrame.
- Removed the unused pandas parser dependency.
- Added privacy-safe parser timing logs containing only file kind, page count, row counts, and duration.

### Measured results

The measurements used isolated synthetic ledgers and production-style `pnpm start`:

| Path | Before at 50k rows | After at 50k rows |
|---|---:|---:|
| Dashboard stats | 689 ms | 293 ms |
| Transaction page 1 | 117 ms | 13 ms |
| Transaction page 1000 | Not measured | 33 ms |
| Dashboard first-load bundle | 344 kB | 229 kB |

At 100k rows, warm stats improved from approximately 1,451 ms to 592 ms.
Development-mode first requests can still be slow because Next.js compiles routes
on demand. Compare with production mode before diagnosing application code, and
ensure only one web process owns port `3000`.
