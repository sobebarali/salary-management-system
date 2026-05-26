---
title: Testing Strategy
description: What we test, why those things, and how the tests stay fast and deterministic.
---

:::note[Explanation — understanding-oriented]
The reasoning behind *what* we test and *why*. Commands to run tests are in
[Configuration & Scripts](/reference/configuration/).
:::

> Status: 🟡 **In progress.** Vitest is wired up (it fits the Vite/Bun toolchain), and the first
> integration specs — the `employee` data model against a real PostgreSQL — are ✅ in
> `packages/db`. The insight/procedure/seed and e2e layers below are still 🟡 designed.

The assignment asks for a **meaningful** set of tests that are **fast, deterministic, and easy to
understand** — not coverage theatre. So we test the parts where bugs would actually hurt the HR
manager, and we keep the bulk of them as pure-function unit tests with no I/O.

## The testing pyramid here

```
        ┌─────────────────────────┐
        │  e2e (manual / few)     │  auth → add employee → see insight update
        ├─────────────────────────┤
        │  integration (some)     │  procedures against a real test Postgres
        ├─────────────────────────┤
        │  unit (most)            │  pure logic: insights math, seed gen, schemas
        └─────────────────────────┘
```

## 1. Unit tests — the core

These need no database and run in milliseconds.

**Salary-insight math.** Extract the aggregation logic where feasible into pure helpers (e.g.
mean, median bucketing, the `HAVING count >= 3` guard) and test against hand-computed fixtures:

```ts
it("median is unaffected by a single outlier", () => {
  expect(median([50, 60, 70])).toBe(60);
  expect(median([50, 60, 70, 10_000_000])).toBe(65); // mean would explode; median barely moves
});
```

**Seed generation.** Because the generator is deterministic, tests are exact:

```ts
it("produces a stable roster for a fixed seed", () => {
  const a = generateEmployees(10_000, 42);
  expect(a).toHaveLength(10_000);
  expect(a[0].firstName + " " + a[0].lastName).toBe(/* known value */);
  expect(generateEmployees(10_000, 42)).toEqual(a); // reproducible
});
```

**Zod schemas.** The shared `employeeInput` schema is the validation contract for both API and
UI, so it earns direct tests: rejects empty names, lower-cases/length-checks `countryCode`,
rejects negative salary, coerces defaults.

**Money conversion.** Major↔minor unit conversion (the `75000.00 ↔ 7500000` boundary) is a
classic off-by-100 bug source — tested explicitly.

## 2. Integration tests — the queries

The insight SQL and CRUD procedures are tested against a **real PostgreSQL** (a disposable test
database / container), not mocks. Aggregation correctness *is* SQL behavior — mocking the DB would
test nothing real.

```ts
beforeEach(async () => {
  await db.delete(employee);
  await db.insert(employee).values(fixtureRoster);  // small, known set
});

it("byCountry returns correct min/max/avg/median", async () => {
  const r = await caller.insights.byCountry({ country: "DE" });
  expect(r).toEqual({ min: …, max: …, avg: …, median: …, headcount: … });
});
```

The fixture is a small hand-built roster (a dozen rows) with values chosen so every metric has a
known, asserted answer.

`★ Insight ─────────────────────────────────────`
- **Mock at the boundary you don't own; use the real thing for what you're testing.** We'd mock an
  external FX API, but never the database when the *thing under test is a SQL aggregate*. A mocked
  `AVG` proves only that the mock returns what we told it to.
- **Determinism comes from the design, not from test tricks.** Because the seed RNG and insight
  helpers are pure, tests assert exact values instead of fuzzy ranges — which is what makes them
  *easy to understand* and non-flaky.
`─────────────────────────────────────────────────`

## 3. End-to-end — the golden path

A thin set covering the one journey that proves the product works: **sign in → add an employee →
the insights dashboard reflects the new salary**. Kept few and high-value; the unit/integration
layers already cover the branches.

## What we deliberately don't test

- Framework internals (TanStack Router, Hono, Better-Auth) — trusted dependencies.
- Generated code (`routeTree.gen.ts`).
- Trivial pass-through procedures with no logic.

## Running

```bash
bun run check-types     # turbo: tsc across all packages
bun run check           # ultracite/biome lint + format check
bun run test            # vitest (turbo test) — needs a reachable Postgres for the db specs
```

The `packages/db` integration specs create and migrate a disposable test database; point them at
one with `TEST_DATABASE_URL` (see [Configuration](/reference/configuration/)).
