---
title: API
description: The oRPC procedures for employee CRUD and salary insights — inputs, outputs, and conventions.
---

:::note[Reference — information-oriented]
The API contract: procedures, inputs, outputs, errors. Look things up here; don't expect a walkthrough.
:::

> Status: ✅ The oRPC plumbing (`publicProcedure`, `protectedProcedure`, context, both handlers)
> exists, and the `employees` and `insights` routers below are implemented in
> `packages/api/src/routers/` — both covered by integration tests against a real Postgres. The web
> UI that consumes them is still 🟡 designed.

## Conventions

- **Transport:** [oRPC](https://orpc.unnoq.com). The web app calls procedures over `/rpc` with a
  fully typed client; the same router is also exposed as OpenAPI/REST at `/api-reference`.
- **Auth:** every employee and insight procedure is a `protectedProcedure` — it requires a valid
  Better-Auth session, otherwise `ORPCError("UNAUTHORIZED")`. (See `packages/api/src/index.ts`.)
- **Validation:** every input is a Zod schema. Validation failures return a typed input error,
  surfaced as a toast in the UI.
- **Naming:** routers are namespaced (`employees.*`, `insights.*`) and composed into `appRouter`.

```ts
// packages/api/src/index.ts  (already implemented)
const requireAuth = o.middleware(async ({ context, next }) => {
  if (!context.session?.user) throw new ORPCError("UNAUTHORIZED");
  return next({ context: { session: context.session } });
});
export const protectedProcedure = publicProcedure.use(requireAuth);
```

## Shared input schemas

```ts
import { z } from "zod";

const countryCode = z.string().length(2).toUpperCase();

const employeeInput = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().min(1).max(120),
  countryCode,
  salary: z.number().int().nonnegative(),        // minor units
  currency: z.string().length(3).default("USD"),
  department: z.string().max(120).optional(),
  email: z.email().optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]).default("full_time"),
  hireDate: z.iso.date().optional(),
});
```

## `employees` router ✅

| Procedure | Kind | Input | Returns |
| --- | --- | --- | --- |
| `employees.list` | query | `{ page, pageSize, country?, jobTitle?, search?, sort? }` | `{ rows, total, page, pageSize }` |
| `employees.get` | query | `{ id }` | `Employee` |
| `employees.create` | mutation | `employeeInput` | `Employee` |
| `employees.update` | mutation | `{ id, ...partial(employeeInput) }` | `Employee` |
| `employees.delete` | mutation | `{ id }` | `{ id }` |

### `employees.list` — paginated, filtered, sorted

This is the workhorse for a 10,000-row roster, so it is **server-side** paginated and filtered.

```ts
const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  country: countryCode.optional(),
  jobTitle: z.string().optional(),
  search: z.string().optional(),                 // matches first/last name
  sort: z.enum(["salary_asc", "salary_desc", "name_asc", "name_desc"]).default("name_asc"),
});
```

It returns both the page of `rows` and the `total` count (a second `COUNT(*)` with the same
filters) so the UI can render pagination controls. The `pageSize` is capped at 100 to bound the
payload regardless of what the client asks for.

`★ Insight ─────────────────────────────────────`
- **Never ship 10k rows to the browser.** Offset/limit pagination keeps each response tiny and
  predictable. The cost — `OFFSET` gets slower on deep pages — is irrelevant here because an HR
  manager filters down (`country = "DE"`) long before reaching page 400. If deep pagination ever
  mattered, keyset/cursor pagination is the upgrade path.
- **Validate at the boundary, trust within.** Zod runs once at the procedure edge; everything
  downstream (Drizzle query, DB) receives already-clean, correctly-typed data — so there's no
  defensive re-checking deeper in the stack.
`─────────────────────────────────────────────────`

### Mutations

`create` / `update` / `delete` validate input, perform the Drizzle write, and return the affected
row (or id). `update` takes a partial schema so the UI can PATCH a single field. After any
mutation, the web app invalidates the relevant TanStack Query keys so the list and insights
refresh automatically.

## `insights` router ✅

These map directly to the assignment's required metrics. The aggregation runs **in PostgreSQL** —
see [Salary Metrics](/reference/salary-metrics/) for the SQL and metric definitions.

| Procedure | Input | Returns |
| --- | --- | --- |
| `insights.byCountry` | `{ country }` | `{ min, max, avg, median, headcount }` |
| `insights.jobTitleInCountry` | `{ country, jobTitle }` | `{ avg, median, headcount }` |
| `insights.overview` | `{}` | `{ totalEmployees, countries, currency }` |
| `insights.salaryByCountry` | `{}` | `Array<{ country, avg, headcount }>` (for the dashboard) |
| `insights.topJobTitles` | `{ country?, limit }` | `Array<{ jobTitle, avg, headcount }>` |
| `insights.histogram` | `{ country }` | `Array<{ bucket, count }>` (salary distribution) |

All monetary fields come back as **integer minor units** in the row's `currency`; the UI formats
them. Mixed-currency averages are addressed in [Salary Metrics](/reference/salary-metrics/#a-note-on-currency).

## Error model

| Condition | Result |
| --- | --- |
| No session | `ORPCError("UNAUTHORIZED")` → UI redirects to `/login`. |
| Invalid input | Zod input error → field-level message / toast. |
| Not found (`get`/`update`/`delete`) | `ORPCError("NOT_FOUND")`. |
| Unexpected | Caught by the `onError` interceptor, logged via evlog, generic 500 to client. |
