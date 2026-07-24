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

Parser API docs (while running): http://localhost:8000/docs

## Troubleshooting

- **`better-sqlite3` build errors** — prebuilt binaries cover Node ≥ 20; if your
  platform misses one, run `pnpm --dir app rebuild better-sqlite3`.
- **Parser unreachable** — the web app expects uvicorn on `:8000`; `pnpm dev`
  starts both. Check `parser/.venv` exists (re-run `pnpm setup`).
