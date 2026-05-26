---
title: Frontend & UX
description: The screens the HR manager uses, the component stack, and the data-fetching patterns.
---

:::note[Explanation — understanding-oriented]
How the UI is shaped and why. Step-by-step usage lives in
[How-to: Manage employees](/how-to/manage-employees/).
:::

> Status: ✅ Auth screens (sign-in / sign-up), routing, theming, and the oRPC+TanStack Query
> client are in place. 🟡 The Employees and Insights screens below are to be built in
> `apps/web/src/routes/`.

## Stack

- **React 19** with **TanStack Router** — file-based, fully typed routes in `apps/web/src/routes/`.
- **TanStack Query** wired to oRPC via `createTanstackQueryUtils` (`apps/web/src/utils/orpc.ts`)
  — caching, retries, and a global error toast are already configured.
- **shadcn/ui** primitives from `packages/ui` (`@salary-management-system/ui/components/*`) +
  **TailwindCSS v4**.
- **Better-Auth client** (`apps/web/src/lib/auth-client.ts`) guards protected routes.

## Screens

### Authentication ✅

Sign-in / sign-up forms exist. The `/dashboard` route already demonstrates the guard pattern:

```ts
beforeLoad: async () => {
  const session = await authClient.getSession();
  if (!session.data) redirect({ to: "/login", throw: true });
  return { session };
}
```

All employee/insight routes reuse this guard.

### Employees list — `/employees` 🟡

The primary workspace. A shadcn **Data Table** over `employees.list`:

- **Server-side pagination** (page / pageSize controls) — never renders 10k rows.
- **Filters**: country (select), job title (combobox), free-text name search — each maps to a
  `employees.list` input field and refetches.
- **Sort**: by name or salary, server-side.
- **Row actions**: edit (opens dialog), delete (confirm dialog).
- **"Add employee"** opens the same form dialog in create mode.

```tsx
const { data } = useQuery(
  orpc.employees.list.queryOptions({ input: { page, pageSize, country, search, sort } })
);
```

### Employee form (create / edit) 🟡

A single `<EmployeeForm>` in a dialog, driven by **TanStack React Form** + the shared Zod schema
(reused from the API — one validation definition, client and server). On submit it calls
`employees.create` / `employees.update`, then invalidates the list and insights queries.

Money input is entered in **major units** ("75000.00") and converted to integer minor units
before the mutation; display uses `Intl.NumberFormat` with the row's currency.

### Insights dashboard — `/insights` 🟡

Answers the persona's compensation questions visually:

- **Country panel**: pick a country → min / max / **average** / **median** / headcount cards.
- **Role-in-country**: pick country + job title → the required "average for a job title in a
  country" figure, with headcount for context.
- **Charts**: salary-by-country bar chart, top-paying roles, and a distribution histogram.

Each card/chart is its own `useQuery` against an `insights.*` procedure, so panels load
independently and cache separately.

`★ Insight ─────────────────────────────────────`
- **The Zod schema is the contract shared by both ends.** The same `employeeInput` schema
  validates the API procedure *and* drives the React form. A new required field is enforced in
  both places from one edit — no client/server validation drift.
- **Query-key invalidation keeps numbers honest.** Because insights are derived from the roster,
  every mutation invalidates `insights.*`. The HR manager never sees a stale average after
  editing a salary — without any manual refresh.
`─────────────────────────────────────────────────`

## Accessibility & UX notes

Per the project's Ultracite standards (`.claude/CLAUDE.md`):

- Semantic elements and labelled inputs; the data table is keyboard-navigable.
- Destructive actions (delete) require a confirmation dialog.
- Loading and empty states are explicit (skeletons / "no employees match these filters").
- Errors surface as toasts via the global `QueryCache.onError` already configured in `orpc.ts`.
