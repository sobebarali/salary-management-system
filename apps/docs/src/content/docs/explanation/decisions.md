---
title: Decisions (ADRs)
description: Architecture Decision Records — the significant choices, their context, and their consequences.
---

:::note[Explanation — understanding-oriented]
These are **Architecture Decision Records** ([ADR format](https://adr.github.io)): each captures
a decision, *why* it was made, and what we trade off. They explain the reasoning that the
[Reference](/reference/data-model/) pages only state as fact.
:::

Each record: **Status · Context · Decision · Consequences.**

---

## ADR-0001 — Monorepo on the Better-T-Stack

**Status:** Accepted ✅

**Context.** One deliverable spans a typed API, a React UI, a seed script, and docs. Keeping the
schema, server, and client in sync by hand across separate repos is error-prone.

**Decision.** Use a single Turborepo + Bun-workspaces monorepo scaffolded with the Better-T-Stack
(`apps/{web,server,docs}`, `packages/{api,auth,db,ui,env,config}`).

**Consequences.** One install, one type graph, cached task runs. The DB schema is the single
source of truth that flows everywhere. Cost: monorepo tooling overhead and a steeper first-read
for newcomers — mitigated by these docs.

---

## ADR-0002 — oRPC for the API layer

**Status:** Accepted ✅

**Context.** The UI and server are both TypeScript. A hand-written REST contract would need
manual client types and could silently drift from the server.

**Decision.** Use **oRPC**. The web app imports only the `AppRouter` *type* and gets a fully typed
client; the same router is simultaneously exposed as OpenAPI/REST at `/api-reference`.

**Consequences.** Renaming a field or changing a return shape is a compile error in the UI — drift
is impossible. We also get a browsable OpenAPI surface for free. Cost: a stack-specific
abstraction rather than plain HTTP; external (non-TS) consumers use the OpenAPI surface, not the
RPC client.

---

## ADR-0003 — Compute insights in PostgreSQL, not in JavaScript

**Status:** Accepted ✅

**Context.** Salary insights aggregate over up to 10k rows (min/max/avg/median/distribution).

**Decision.** Push all aggregation into SQL (`avg`, `min`, `max`, `percentile_cont`,
`width_bucket`). The server returns only the computed numbers.

**Consequences.** Correct and fast (single-digit ms), tiny payloads, no re-implementing statistics
in JS. Cost: the logic lives in SQL strings/Drizzle rather than unit-testable pure functions — so
we cover it with [integration tests against a real DB](/explanation/testing/).

---

## ADR-0004 — Store salary as integer minor units

**Status:** Accepted ✅

**Context.** Money in floating point causes rounding errors; `numeric` arrives in JS as a string.

**Decision.** Store `salary` as an `integer` of minor units (e.g. `7500000` = 75,000.00).
Formatting to display strings is a UI concern (`Intl.NumberFormat`).

**Consequences.** Exact arithmetic, fast `SUM`/`AVG`, trivial JSON serialization. Cost: callers
must convert at the edges (UI input → minor units); a 32-bit `integer` caps at ~21.4M major units
(ample) — bump to `bigint` only if ever needed.

---

## ADR-0005 — Normalize country as ISO 3166-1 alpha-2

**Status:** Accepted ✅

**Context.** Country is a `GROUP BY` key for every per-country insight. Free-text ("Germany" vs
"germany" vs "DE") would silently split buckets and corrupt aggregates.

**Decision.** Store `country_code` as a 2-letter ISO code; the UI maps codes ↔ display names.

**Consequences.** Exact grouping and clean joins to country metadata. Cost: an input mapping layer
in the UI, and a migration concern if we ever localize names.

---

## ADR-0006 — Server-side pagination & filtering for the employee list

**Status:** Accepted ✅

**Context.** The roster is 10,000 rows; the HR manager can't scroll that, and shipping it all is wasteful.

**Decision.** `employees.list` paginates (offset/limit, `pageSize` capped at 100) and filters
(country, job title, name search) and sorts **server-side**, returning a page plus a `total`.

**Consequences.** Small, predictable payloads regardless of roster size. Cost: deep `OFFSET` pages
get slower — irrelevant here because filtering narrows results long before that; keyset/cursor
pagination is the noted upgrade path.

---

## ADR-0007 — Seed with batched multi-row inserts (defer `COPY`)

**Status:** Accepted ✅ (with 🔭 `COPY` deferred)

**Context.** The seed runs regularly and must be fast. Naïve per-row inserts mean 10,000
round-trips.

**Decision.** Generate all rows in memory (deterministic PRNG), then insert in ~1,000-row chunks
inside a single transaction. See [How-to: Seed](/how-to/seed/).

**Consequences.** ~1000× fewer round-trips → sub-second, atomic, idempotent. We **deferred**
PostgreSQL `COPY` (5–10× faster) because batched inserts already clear the bar at 10k (YAGNI);
`COPY` is the documented next step for 100k–1M.

---

## ADR-0008 — Index for the known insight access patterns

**Status:** Accepted ✅

**Context.** At 10k rows a sequential scan is already milliseconds, so indexes aren't required for
*today's* performance.

**Decision.** Add indexes on `(country_code)`, `(country_code, job_title)`, and `(job_title)`
anyway — derived directly from the required queries.

**Consequences.** Access patterns are explicit and self-documenting, and the design scales past
10k without a rewrite. Cost: marginally slower writes and a little storage — negligible at this scale.

---

## ADR-0009 — Deliberate scope cuts

**Status:** Accepted ✅

**Context.** The brief asks for a *minimal yet usable* tool. Gold-plating would dilute quality
where it matters.

**Decision.** Out of scope: multi-tenancy/org hierarchy, payroll execution, historical
compensation/audit trail, and role-based access control (a single authenticated HR-manager role).

**Consequences.** Effort concentrates on the required employee management, insights, and a fast
seed — done well. Each cut is a clean future extension point, not a dead end. See
[Problem & Goals](/explanation/problem-and-goals/).
