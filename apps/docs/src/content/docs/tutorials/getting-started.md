---
title: Getting Started
description: A start-to-finish lesson — from a fresh clone to a running, seeded app in your browser.
---

:::note[Tutorial — learning-oriented]
A hands-on lesson. Follow every step in order; by the end you'll have the whole system running
locally with 10,000 employees and working salary insights. We explain *just enough* to keep you
moving — the *why* lives in [Explanation](/explanation/architecture/).
:::

## What you'll achieve

By the end of this tutorial you will have:

1. The monorepo installed and the database running.
2. The schema applied and **10,000 employees** seeded.
3. The API server and the web app running.
4. Signed in, added an employee, and seen the salary insights update.

## Prerequisites

- **[Bun](https://bun.sh) 1.3+** — the package manager and runtime (`bun --version`).
- **PostgreSQL** — either a local install, or Docker (the repo's `db:start` script can manage a
  local instance for you).
- **Git**.

## Step 1 — Install

```bash
git clone <your-fork-url> salary-management-system
cd salary-management-system
bun install
```

Bun reads the workspace `catalog:` versions and links all `apps/*` and `packages/*` together.

## Step 2 — Configure environment

The server validates its environment at startup (via `@t3-oss/env-core`), so set these before
running it. Create `apps/server/.env`:

```bash
DATABASE_URL="postgres://user:password@localhost:5432/salary"
BETTER_AUTH_SECRET="a-long-random-string-at-least-32-characters"
BETTER_AUTH_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:5173"
```

And `apps/web/.env`:

```bash
VITE_SERVER_URL="http://localhost:3000"
```

See [Configuration & Scripts](/reference/configuration/) for the full list and what each does.

## Step 3 — Start the database

If you're using the repo's managed local Postgres:

```bash
bun run db:start
```

(Or point `DATABASE_URL` at any Postgres you already have.)

## Step 4 — Apply the schema

```bash
bun run db:push
```

This pushes the Drizzle schema (auth tables + the `employee` table) into your database.

## Step 5 — Seed 10,000 employees

```bash
bun run db:seed
```

You should see it finish in well under a second — that speed is the whole point of the
[batched seeding design](/how-to/seed/). Re-running it is safe; it clears and re-seeds.

## Step 6 — Run the app

```bash
bun run dev
```

Turborepo starts everything in parallel:

- Web app → <http://localhost:5173>
- API server → <http://localhost:3000>

Open <http://localhost:5173>. The home page shows an **API Status** indicator — green means the
web app is talking to the server.

## Step 7 — Sign in and explore

1. Create an account (email + password) — this is *your* HR-manager login, separate from the
   employee roster.
2. Go to **Employees**: you'll see the seeded roster, paginated.
3. Click **Add employee**, fill in name / job title / country / salary, and save.
4. Open **Insights**, pick that employee's country, and watch the **average / median / headcount**
   reflect your change.

## You're done

You now have the full system running. Next:

- **Do a specific task** → [How-to Guides](/how-to/seed/).
- **Look something up** → [Reference](/reference/api/).
- **Understand the design** → [Explanation](/explanation/architecture/).
