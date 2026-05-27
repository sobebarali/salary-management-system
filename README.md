# Salary Management System

A minimal yet usable salary management tool for an organization with ~10,000 employees.
The user is an **HR Manager**: they manage the employee roster and read salary insights
to make compensation decisions.

Built as a TypeScript monorepo with a strict **TDD** discipline — the commit history is
meant to read as the test-first story, one small step at a time.

## Live demo

A deployed instance runs on Railway (web SPA + Hono API + Postgres + docs):

| | URL |
|---|---|
| **App** — sign in here | https://web-production-aba46.up.railway.app |
| **API** + Swagger | https://salary-management-system-production-c726.up.railway.app/api-reference |
| **Docs** | https://docs-production-cb01.up.railway.app |

**Demo login:** `hr@salary.test` · `HrManager78a56fdd!`

> Public demo with seeded, fictional data. These credentials are shared, so anyone
> can sign in and change the demo roster — don't enter anything real.

## What it does

| Capability | Where |
|---|---|
| Add / view / update / delete employees (UI) | `apps/web` employees screen + form dialog |
| Server-side paginated, filtered, sorted roster (never ships 10k rows to the browser) | `employees.list` |
| Min / max / **average** salary per country | `insights.salaryByCountry` |
| Average salary for a **job title within a country** | `insights.topJobTitles` |
| Salary distribution **histogram** (extra HR-useful metric) | `insights.histogram` |
| Fast, deterministic **10k-employee seed** | `packages/db/src/seed.ts` (`bun run db:seed`) |

A few deliberate domain rules: money is stored as **integer minor units** with an ISO-4217
currency (never floats); country is normalized **ISO 3166-1 alpha-2**; every salary metric
is computed **in PostgreSQL** (`avg`/`min`/`max`/`percentile`/`width_bucket`), never by pulling
the roster into JS; and every domain procedure requires a valid auth session.

## Stack

- **`apps/web`** — React 19 · TanStack Router (file-based) + Query · Tailwind v4 · shadcn/ui (via `packages/ui`) · oRPC client · Better-Auth client.
- **`apps/server`** — Hono (`@hono/node-server`) mounting Better-Auth (`/api/auth/*`), oRPC (`/rpc`), and OpenAPI/Swagger (`/api-reference`); evlog logging + CORS.
- **`apps/docs`** — Astro Starlight technical docs, organized with **Diátaxis**.
- **`packages/`** — `api` (oRPC routers), `auth` (Better-Auth + Drizzle adapter), `db` (Drizzle + PostgreSQL schema — *source of truth*), `ui`, `env` (`@t3-oss/env-core` + Zod), `config`.
- Tooling: Turborepo + Bun workspaces (`catalog:` deps), Ultracite/Biome, Husky.

```
            type-safe RPC (types only over the wire)
  apps/web ──────────────────────────────────────▶ apps/server ──▶ PostgreSQL
  (React SPA)        oRPC client / Better-Auth        (Hono)          (Drizzle)
```

Ports: web **5173**, server **3000**, Swagger **3000/api-reference**.

## Quickstart (local development)

Requires [Bun](https://bun.sh) and a PostgreSQL instance.

```bash
bun install

# 1. Configure env (templates are committed; real .env files are gitignored)
cp apps/server/.env.example apps/server/.env   # set DATABASE_URL + BETTER_AUTH_SECRET
cp apps/web/.env.example apps/web/.env          # VITE_SERVER_URL=http://localhost:3000

# 2. Create the schema (drizzle-kit), then seed 10k employees
bun run db:push        # or `bun run db:migrate` to apply committed migrations
bun run db:seed

# 3. Run web + server together
bun run dev
```

Open **http://localhost:5173**, sign up, and you're in. The API and Swagger UI are at
**http://localhost:3000** and **/api-reference**.

> No local Postgres? `bun run db:start` brings one up via Docker (`packages/db/docker-compose.yml`).

## Run the whole stack in Docker

```bash
cp .env.example .env && docker compose -f docker-compose.prod.yml up --build
# web → http://localhost:8080 · server → http://localhost:3000
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full guide (compiled-binary server,
the `VITE_SERVER_URL` build-time gotcha, cross-origin auth cookies, migrations, and
real-host hardening).

## Testing

```bash
bun run test          # unit + integration (vitest). Integration tests hit a real Postgres.
bun run check-types   # TypeScript across all packages
bun run check         # Ultracite/Biome lint + format check
```

- **Pure logic** (money major/minor conversion, deterministic seed generation, Zod schemas) → exact unit tests, no I/O.
- **SQL aggregates and oRPC procedures** → integration tests against a real Postgres, never mocked — so the insight math is actually verified.
- Golden-path **Playwright** e2e (sign up → add employee → insights): `bun run --filter web test:e2e`.

## Documentation

The Starlight site under `apps/docs` is the source of truth for design and contracts,
organized with [Diátaxis](https://diataxis.fr): **Tutorials** (getting started),
**How-to** (seed, manage employees, deploy), **Reference** (data model, API, salary
metrics, configuration), and **Explanation** (problem & goals, architecture/C4, frontend,
testing, and ADRs — the *why* behind each decision).

```bash
cd apps/docs && bun run dev     # browse the docs locally
```

## Project structure

```
salary-management-system/
├── apps/
│   ├── web/      # React + TanStack Router SPA
│   ├── server/   # Hono API (Better-Auth, oRPC, OpenAPI)
│   └── docs/     # Astro Starlight technical docs
├── packages/
│   ├── api/      # oRPC routers & procedures
│   ├── auth/     # Better-Auth + Drizzle adapter
│   ├── db/       # Drizzle schema (source of truth) + 10k seed
│   ├── ui/       # Shared shadcn/ui primitives
│   ├── env/      # Validated env (@t3-oss/env-core + Zod)
│   └── config/   # Shared TS config
├── docker-compose.prod.yml
└── DEPLOYMENT.md
```

## Key scripts

| Script | Does |
|---|---|
| `bun run dev` | Start web + server (Turborepo) |
| `bun run dev:web` / `dev:server` | Start one app |
| `bun run db:push` / `db:migrate` / `db:seed` | Schema + seed |
| `bun run db:studio` | Drizzle Studio |
| `bun run test` / `check-types` / `check` | Tests · types · lint |
| `bun run build` | Build all apps |
