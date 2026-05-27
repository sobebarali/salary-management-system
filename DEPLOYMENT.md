# Deployment

This project ships as Docker images so it runs the same on a laptop, a VM, or any
container host. The stack is five pieces:

```
┌─────────────┐      ┌──────────────────┐      ┌────────────────────┐
│  web        │      │  server          │      │  postgres          │
│  nginx      │──────▶  Hono (Bun-       │──────▶  PostgreSQL 17     │
│  static SPA │ /rpc │  compiled binary) │ SQL  │  (named volume)    │
│  :8080      │ auth │  :3000           │      │  internal only     │
└─────────────┘      └──────────────────┘      └────────────────────┘
                            ▲
                     ┌──────┴───────┐         ┌──────────────────┐
                     │  migrate     │         │  docs            │
                     │  drizzle-kit │         │  nginx static    │
                     │  (one-shot)  │         │  Starlight :8081 │
                     └──────────────┘         └──────────────────┘
```

- **web** — the Vite/React SPA, built to static files and served by `nginx:alpine` with SPA fallback.
- **server** — the Hono API, compiled by `bun build --compile` into one self-contained binary on a minimal `debian-slim` runtime (no `node_modules`, sub-second cold start).
- **migrate** — a one-shot that applies committed Drizzle migrations before the server starts.
- **postgres** — PostgreSQL 17 with a named volume for durable data.
- **docs** — the Astro Starlight technical docs, built to static files and served by `nginx:alpine`. Independent of the API and database (no env/build args).

> **Why a compiled binary for the server?** On a Bun workspace, `turbo prune --docker`
> currently has a `bun.lock` regression (turborepo #12262, early 2026) that breaks
> `bun install --frozen-lockfile`. Compiling to a single binary resolves the whole
> dependency graph at build time, so the runtime never touches the lockfile and the
> image needs nothing but the binary. See the optional `turbo prune` note at the bottom.

## Prerequisites

- Docker Engine with Compose v2 (`docker compose version`).
- For a real deployment: a host with Docker, and (recommended) a managed PostgreSQL.

## Quickstart (local, the whole stack in Docker)

```bash
cp .env.example .env          # then edit .env (see below)
docker compose -f docker-compose.prod.yml up --build
```

Then open **http://localhost:8080**. The API is at **http://localhost:3000**
(Swagger/OpenAPI at `http://localhost:3000/api-reference`), and the technical
docs are at **http://localhost:8081**.

Seed 10,000 employees (optional, runs the fast batched seed):

```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

Tear down (keep data) / wipe data:

```bash
docker compose -f docker-compose.prod.yml down       # stops, keeps the volume
docker compose -f docker-compose.prod.yml down -v     # also deletes Postgres data
```

## Environment variables

All set in `.env` (gitignored). `docker-compose.prod.yml` derives the server's
`DATABASE_URL` from the `POSTGRES_*` parts, so there is one source of truth.

| Variable | Used by | Notes |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | postgres, derives `DATABASE_URL` | Use a strong password in production. |
| `BETTER_AUTH_SECRET` | server | 32+ chars. Generate: `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | server | Public origin of the **server** (where auth cookies are issued/validated). |
| `CORS_ORIGIN` | server | Public origin of the **web** app. Must be exact (no trailing slash). |
| `VITE_SERVER_URL` | web (build arg) | Public origin of the **server**. **Baked at build time** — see below. |

### `VITE_SERVER_URL` is a build-time value, not a runtime one

The SPA is static files. Vite **inlines** `import.meta.env.VITE_*` into the bundle
when it builds, so a runtime container env var can never reach the already-built
JS. That is why `VITE_SERVER_URL` is a **build arg** in the web image. If you change
the server's public URL, you must **rebuild** the web image:

```bash
docker compose -f docker-compose.prod.yml build web
```

### Cross-origin auth: keep three values consistent

Auth uses cookies with `credentials: true`. For the browser to send and accept them:

- `CORS_ORIGIN` (server) **must equal** the web app's real origin.
- `VITE_SERVER_URL` (web) **must equal** the server's real origin (= `BETTER_AUTH_URL`).
- In real production these must be **HTTPS**. Cross-site cookies require
  `SameSite=None; Secure`, which browsers only honor over TLS. Put both behind a
  reverse proxy / load balancer that terminates HTTPS, or serve web and server
  under the same parent domain to keep cookies same-site.

## Migrations and seeding

- The `migrate` service runs `drizzle-kit migrate` against the committed migrations
  in `packages/db/src/migrations`, then exits. The `server` waits for it to finish
  (`depends_on: migrate: condition: service_completed_successfully`).
- New schema changes: generate a migration in dev (`bun run db:generate`), commit it,
  and the `migrate` service applies it on the next deploy.
- Seeding is **opt-in** via the `seed` profile (above) so it never runs automatically.

## Deploying to a real host

This compose file runs end-to-end on a single VM. For anything beyond that:

1. **Use a managed Postgres** (e.g. a cloud provider's PostgreSQL). Drop the
   `postgres` service, remove the `depends_on: postgres`, and point `DATABASE_URL`
   at the managed instance (likely `...?sslmode=require` — the server image bundles
   `ca-certificates` for TLS).
2. **Build and push images** to a registry, or build on the host. The web image
   needs `--build-arg VITE_SERVER_URL=https://api.yourdomain.com`.
3. **Front both services with HTTPS** (reverse proxy / platform router) and set
   `BETTER_AUTH_URL`, `CORS_ORIGIN`, `VITE_SERVER_URL` to the public `https://` origins.
4. The server's compiled binary listens on `:3000`; the web image's nginx on `:80`.

### Production hardening checklist

- [ ] Strong `POSTGRES_PASSWORD` and a freshly generated `BETTER_AUTH_SECRET`.
- [ ] HTTPS in front of both web and server; origins consistent across the three URLs.
- [ ] Postgres not exposed to the public internet (this compose keeps it internal).
- [ ] Backups for the Postgres volume / managed instance.
- [ ] Resource limits and a restart policy (the stack uses `restart: unless-stopped`).

## Building images individually

```bash
# Server (compiled binary)
docker build -f apps/server/Dockerfile -t salary-server .

# Web (provide the server origin at build time)
docker build -f apps/web/Dockerfile --build-arg VITE_SERVER_URL=http://localhost:3000 -t salary-web .

# Docs (no build args — pure static site)
docker build -f apps/docs/Dockerfile -t salary-docs .
```

(Build context is the **repo root** in every case — the Bun workspace needs the whole monorepo.)

## Optional: `turbo prune` to shrink the build context

Once `turbo prune --docker` is stable for Bun lockfiles (track turborepo #12262 and
oven-sh/bun #28600; use `turbo@canary` meanwhile), the builder stages could run
`turbo prune --docker server` / `web` and copy only the pruned `./out` instead of the
whole repo. That trims context size and improves layer caching. It is deliberately
**not** used here to avoid the current lockfile regression — the compiled-binary
server already keeps the runtime image tiny regardless.

## Note on local (non-Docker) development

For day-to-day development you don't need Docker for the app — only Postgres.
See `apps/docs` → *Tutorials → Getting started* for the `bun install` → `db:push`
→ `db:seed` → `bun run dev` flow, and `apps/server/.env.example` /
`apps/web/.env.example` for the env each app expects.
