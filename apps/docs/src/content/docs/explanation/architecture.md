---
title: Architecture
description: The monorepo layout, the runtime stack, and how a request flows end to end.
---

:::note[Explanation — understanding-oriented]
The big picture and the reasoning behind it. For exact schema/API facts, see the
[Reference](/reference/data-model/) section.
:::

The system is a **TypeScript monorepo** built on the [Better-T-Stack](https://better-t-stack.dev)
conventions, managed with **Turborepo** and **Bun workspaces**. The stack is chosen so that a
single type definition flows from the database all the way to the React component.

## C4 model views

We describe the architecture with the [C4 model](https://c4model.com) — zooming from the system
in its environment down to the code-level pieces.

### Level 1 — System Context

Who uses the system and what it depends on.

```
        ┌─────────────┐
        │ HR Manager  │  (Priya — the only human actor)
        └──────┬──────┘
               │ manages employees, reads salary insights (HTTPS)
               ▼
   ┌───────────────────────────┐
   │  Salary Management System │
   └───────────┬───────────────┘
               │ reads/writes
               ▼
        ┌──────────────┐
        │  PostgreSQL  │  (system of record)
        └──────────────┘
```

### Level 2 — Containers

The deployable/runnable units and how they talk.

```
┌────────────────────────────────────────────────────────────────┐
│                    Salary Management System                      │
│                                                                  │
│  ┌──────────────┐   oRPC / HTTPS    ┌────────────────────────┐   │
│  │  Web app     │ ────────────────▶ │  API server (Hono)     │   │
│  │  apps/web    │   (cookie auth)   │  apps/server           │   │
│  │  React 19 +  │ ◀──────────────── │  /api/auth · /rpc ·    │   │
│  │  TanStack    │   typed responses │  /api-reference        │   │
│  └──────────────┘                   └───────────┬────────────┘   │
│                                                  │ SQL (Drizzle)  │
│  ┌──────────────┐                                ▼               │
│  │  Docs site   │                     ┌────────────────────┐     │
│  │  apps/docs   │                     │     PostgreSQL     │     │
│  │  (this site) │                     └────────────────────┘     │
│  └──────────────┘                                                │
└──────────────────────────────────────────────────────────────────┘
```

### Level 3 — Components (inside the API server)

The shared packages compose into the server container:

```
apps/server
   ├─ Hono app  ── middleware: evlog · identifyUser · cors
   ├─ Better-Auth handler        ← packages/auth   ── packages/db
   ├─ oRPC RPCHandler  (/rpc)     ← packages/api    ── packages/db
   └─ oRPC OpenAPIHandler (/api-reference, Swagger)  ← packages/api
```

The **Request flow** section below is the C4 *dynamic view* — the runtime sequence of a single
request through these components.

## Stack at a glance

| Layer | Choice | Why |
| --- | --- | --- |
| Monorepo | Turborepo + Bun workspaces (`catalog:`) | Shared deps via catalog, cached task graph. |
| Frontend | React 19 + TanStack Router + TanStack Query | File-based typed routing, server-state caching. |
| Styling/UI | TailwindCSS v4 + shadcn/ui (`packages/ui`) | Accessible primitives shared across apps. |
| API transport | **oRPC** (RPC + OpenAPI) | End-to-end types *and* a generated REST/Swagger surface. |
| Server | Hono (`@hono/node-server`) | Tiny, fast, Web-standard `Request`/`Response`. |
| Validation | Zod | One schema reused for input validation + types. |
| ORM | Drizzle | SQL-first, fully typed, no heavy runtime. |
| Database | PostgreSQL | Native aggregation (`percentile_cont`, window fns) for insights. |
| Auth | Better-Auth (email/password) | Sessions, Drizzle adapter, cookie-based. |
| Logging | evlog | Structured wide-event logs + Better-Auth user enrichment. |
| Lint/format | Biome via Ultracite | Zero-config, fast, enforced pre-commit. |
| Docs | Astro Starlight (this site) | Content-first docs colocated with code. |

## Monorepo layout

```
salary-management-system/
├── apps/
│   ├── web/        # React + TanStack Router (the HR manager UI)
│   ├── server/     # Hono entrypoint, mounts auth + oRPC handlers
│   └── docs/       # Astro Starlight (this documentation site)
└── packages/
    ├── api/        # oRPC routers + procedures (business logic)
    ├── auth/       # Better-Auth instance (Drizzle adapter)
    ├── db/         # Drizzle client + schema (source of truth)
    ├── ui/         # Shared shadcn/ui primitives + Tailwind tokens
    ├── env/        # Type-safe env parsing (@t3-oss/env-core + Zod)
    └── config/     # Shared TS / tooling config
```

The dependency direction is strict and one-way:

```
db  ──▶  auth ──▶  api ──▶  server
 │                  ▲          
 └──────────────────┘          
                    api ──(types only)──▶  web
ui  ──▶  web
env ──▶  (db, auth, server, web)
```

`packages/db` is the foundation — it owns the schema and is the single source of truth.
`packages/api` exports `AppRouter` *types*, which `apps/web` imports to get a fully typed
client **without importing any server code**.

## Request flow

A read from the employee list, end to end:

```
[React component]
   useQuery(orpc.employees.list.queryOptions({ page, country }))
        │  TanStack Query (cache, retry, dedupe)
        ▼
[oRPC client]  RPCLink → POST /rpc  (credentials: include)
        │  HTTP (cookie carries Better-Auth session)
        ▼
[Hono server]  apps/server/src/index.ts
   1. evlog() middleware            → request wide-event
   2. identifyUser middleware       → attach user to log
   3. cors()                        → guard origin
   4. rpcHandler.handle(prefix /rpc)
        │
        ▼
[oRPC procedure]  packages/api
   createContext() → getSession()   → context.session + context.db
   protectedProcedure middleware    → 401 if no user
   Zod-validated input
        │
        ▼
[Drizzle query]  context.db → PostgreSQL
   SELECT ... WHERE country = $1 ORDER BY ... LIMIT $2 OFFSET $3
        │
        ▼
   Typed rows bubble back up; the client infers the exact return type.
```

`apps/server/src/index.ts` mounts three things in order on the same Hono app:

1. **`/api/auth/*`** → handled by Better-Auth directly.
2. **`/rpc/*`** → the oRPC `RPCHandler` (what the typed client calls).
3. **`/api-reference/*`** → the oRPC `OpenAPIHandler` with a Swagger UI plugin, so the same
   procedures are also browsable as REST + OpenAPI.

`★ Insight ─────────────────────────────────────`
- **Types over the wire, not code over the wire.** The web app imports only `AppRouter` *types*
  from `packages/api`. At build time these are erased, so no server logic ships to the browser —
  yet a renamed field or changed return shape is a compile error in the UI. That's the core
  payoff of oRPC/tRPC-style stacks.
- **One handler, two protocols.** Mounting both `RPCHandler` and `OpenAPIHandler` over the same
  router means the type-safe client and a public OpenAPI/REST surface never drift apart.
`─────────────────────────────────────────────────`

## Current implementation status

- ✅ Monorepo, Turborepo pipeline, server bootstrap, CORS, logging.
- ✅ Better-Auth (email/password) with Drizzle adapter; `user/session/account/verification` tables.
- ✅ oRPC wired with demo procedures (`healthCheck`, `privateData`).
- ✅ Employee schema, and the `employees` CRUD + `insights` procedures, with integration tests
  against a real PostgreSQL.
- ✅ The fast, deterministic 10k seed script (`bun run db:seed`).
- 🟡 The web UI (specified in the Design and Engineering sections).
