---
title: Deploy with Docker
description: Containerize and run the full stack — web, server, Postgres, migrations, and docs — with Docker Compose.
---

:::note[How-to guide — task-oriented]
A recipe to get the app running in containers. The full reference (env table,
hardening checklist, real-host notes) lives in **`DEPLOYMENT.md`** at the repo root.
:::

> Status: ✅ **Implemented** — `apps/server/Dockerfile`, `apps/web/Dockerfile`,
> `apps/docs/Dockerfile` (+ `apps/web/nginx.conf` and `apps/docs/nginx.conf`), and
> `docker-compose.prod.yml`. `.env.example` templates sit at the repo root and in each app.

## Live deployment

A live instance runs on Railway — each service builds from its Dockerfile on every
push to `main`:

| Service | URL |
|---|---|
| App | <https://web-production-aba46.up.railway.app> |
| API + Swagger | <https://salary-management-system-production-c726.up.railway.app/api-reference> |
| Docs | <https://docs-production-cb01.up.railway.app> |

**Demo login:** `hr@salary.test` · `HrManager78a56fdd!` — a public, shared account over
seeded fictional data, so don't enter anything real.

## The stack

Five containers: a static **web** SPA (nginx), the **server** compiled to a
self-contained binary, a one-shot **migrate** step, **postgres** with a named volume,
and this static **docs** site (nginx).

- **server** — `bun build --compile` bundles the whole dependency graph into one
  binary, so the runtime image carries no `node_modules` and starts in well under a
  second. On a Bun workspace this also sidesteps the current `turbo prune --docker`
  / `bun.lock` regression (turborepo #12262).
- **web** — Vite builds static files served by `nginx:alpine` with SPA fallback.
- **docs** — Astro Starlight builds to static files served by `nginx:alpine`. It's a
  multi-page site (not a SPA), so unknown paths return 404 rather than the homepage.
  Independent of the API and database — no env or build args.

## Run it

```bash
cp .env.example .env          # edit: Postgres creds, BETTER_AUTH_SECRET, the three origins
docker compose -f docker-compose.prod.yml up --build
```

- Web → http://localhost:8080
- Server → http://localhost:3000 (OpenAPI at `/api-reference`)
- Docs → http://localhost:8081

Seed 10k employees (opt-in profile):

```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

## Two things that bite people

1. **`VITE_SERVER_URL` is baked at build time.** Vite inlines `import.meta.env.VITE_*`
   into the static bundle, so it's a Docker **build arg**, not a runtime env var.
   Change the server URL → rebuild the web image (`docker compose ... build web`).
2. **Cross-origin auth cookies must line up.** `CORS_ORIGIN` (server) = the web origin;
   `VITE_SERVER_URL` (web) = the server origin = `BETTER_AUTH_URL`. In real production
   all three must be **HTTPS**, because cross-site cookies need `SameSite=None; Secure`.

## Migrations

The `migrate` service runs `drizzle-kit migrate` against the committed migrations in
`packages/db/src/migrations`, then exits; the server waits for it to complete. New
schema → `bun run db:generate`, commit the migration, redeploy.

See **`DEPLOYMENT.md`** for the env-var reference, the production hardening checklist,
managed-Postgres setup, and the optional `turbo prune` path.
