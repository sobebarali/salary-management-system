---
title: Manage employees
description: Task recipes for the HR manager — add, edit, delete, filter, and answer compensation questions.
---

:::note[How-to guide — task-oriented]
Goal-oriented recipes. Each assumes the app is running and you're signed in
(see [Getting Started](/tutorials/getting-started/)). For the screen designs and *why*, see
[Frontend & UX](/explanation/frontend/).
:::

> Status: 🟡 The Employees and Insights screens are designed, not yet built. The steps below
> describe the intended flows.

## Add an employee

1. Go to **Employees**.
2. Click **Add employee**.
3. Fill in the required fields: **full name** (first + last), **job title**, **country**, **salary**.
   Optionally set department, email, employment type, and hire date.
4. Enter the salary in normal units (e.g. `75000`) — it's converted to minor units on save.
5. Click **Save**. The row appears in the list and the insights refresh automatically.

## Edit an employee

1. In the Employees list, find the row (use filters/search below).
2. Click the row's **Edit** action.
3. Change any field — only what you change is sent (a partial update).
4. **Save**. Affected insights update immediately.

## Delete an employee

1. Click the row's **Delete** action.
2. Confirm in the dialog (this is irreversible).

## Find a specific employee in 10,000 rows

Don't scroll — narrow the list, all server-side:

- **Filter by country** — select a country to see only that roster.
- **Filter by job title** — combine with country to drill in.
- **Search by name** — matches first or last name.
- **Sort** — by name or salary, ascending/descending.

Each control re-queries `employees.list`; only the matching page comes back over the wire.

## Answer "what's the average salary for a job title in a country?"

This is the assignment's headline insight:

1. Go to **Insights**.
2. In the **role-in-country** panel, pick a **country** and a **job title**.
3. You get the **average** (and median + headcount for context).

## Read a country's salary band

1. On **Insights**, pick a **country**.
2. You'll see **min / max / average / median / headcount**, plus a distribution histogram so you
   can see the *shape* of pay, not just one number.

See [Salary Metrics](/reference/salary-metrics/) for exactly how each figure is computed.
