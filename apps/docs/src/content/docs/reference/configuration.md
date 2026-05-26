---
title: Configuration & Scripts
description: Environment variables and the workspace scripts, exactly as defined in the repo.
---

:::note[Reference — information-oriented]
Look-up tables for environment variables and commands. No tutorials here — see
[Getting Started](/tutorials/getting-started/) to put them in order.
:::

## Environment variables

Validated at startup with `@t3-oss/env-core` + Zod (`packages/env`). A missing or malformed value
fails fast with a clear error rather than surfacing later as a runtime bug.

### Server — `apps/server/.env`

Schema: `packages/env/src/server.ts`.

| Variable | Type / rule | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | string, non-empty | PostgreSQL connection string used by Drizzle. |
| `BETTER_AUTH_SECRET` | string, **min 32 chars** | Signing secret for Better-Auth sessions. |
| `BETTER_AUTH_URL` | URL | Public base URL of the auth server (e.g. `http://localhost:3000`). |
| `CORS_ORIGIN` | URL | Allowed browser origin; also a Better-Auth trusted origin (e.g. `http://localhost:5173`). |
| `NODE_ENV` | `development` \| `production` \| `test` | Defaults to `development`. |

### Web — `apps/web/.env`

Schema: `packages/env/src/web.ts`. Client vars **must** be prefixed `VITE_` to be exposed to the browser.

| Variable | Type / rule | Purpose |
| --- | --- | --- |
| `VITE_SERVER_URL` | URL | Base URL the web app calls for `/rpc` and auth. |

:::caution
`emptyStringAsUndefined` is on, so an empty value is treated as *unset* and fails validation —
set a real value or remove the line.
:::

## Workspace scripts

Run from the repo root (defined in the root `package.json`). Turborepo orchestrates them across
the workspace.

### App lifecycle

| Script | What it does |
| --- | --- |
| `bun run dev` | Start all apps (web, server, docs) in parallel via `turbo dev`. |
| `bun run dev:web` | Start only the web app (`turbo -F web dev`). |
| `bun run dev:server` | Start only the API server (`turbo -F server dev`). |
| `bun run build` | Build all apps (`turbo build`). |
| `bun run check-types` | TypeScript check across the workspace (`turbo check-types`). |

### Database (Drizzle, `packages/db`)

| Script | What it does |
| --- | --- |
| `bun run db:push` | Push the Drizzle schema to the database (no migration files). |
| `bun run db:generate` | Generate migration artifacts from schema changes. |
| `bun run db:migrate` | Apply migrations. |
| `bun run db:studio` | Open Drizzle Studio (DB browser UI). |
| `bun run db:start` / `db:stop` / `db:down` | Manage the local database instance lifecycle. |
| `bun run db:watch` | Watch mode for local DB. |
| `bun run db:seed` | 🟡 *To be added* — clears and seeds 10,000 employees (see [How-to: Seed](/how-to/seed/)). |

### Code quality

| Script | What it does |
| --- | --- |
| `bun run check` | Lint + format check via Ultracite/Biome. |
| `bun run fix` | Auto-fix lint/format issues. |
| `bun run prepare` | Install Husky git hooks. |

:::tip
The project enforces Ultracite/Biome standards (see `.claude/CLAUDE.md`). Run `bun run fix`
before committing — a Husky pre-commit hook checks staged files.
:::

## Ports

| Service | URL |
| --- | --- |
| Web app (Vite) | `http://localhost:5173` |
| API server (Hono) | `http://localhost:3000` |
| OpenAPI / Swagger | `http://localhost:3000/api-reference` |
