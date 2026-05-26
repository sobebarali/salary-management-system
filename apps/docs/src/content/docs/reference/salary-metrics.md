---
title: Salary Metrics
description: Exact metric definitions and the PostgreSQL queries that compute them.
---

:::note[Reference — information-oriented]
Precise metric definitions and the SQL that computes them. The *why* (mean vs. median, etc.) is
called out inline but the design rationale lives in [Explanation → Decisions](/explanation/decisions/).
:::

> Status: 🟡 **Designed.** Backs the `insights` router in the [API](/reference/api/).

Every metric is computed **in PostgreSQL**, not in JavaScript. The database is built for
aggregation, the math stays correct on large sets, and we never pull 10k rows into the server
just to average them.

## Required metrics

### 1. Min / max / average salary in a country

```sql
SELECT
  min(salary)            AS min,
  max(salary)            AS max,
  round(avg(salary))::int AS avg,
  count(*)               AS headcount
FROM employee
WHERE country_code = $1;
```

Uses `employee_country_idx`. `avg` is rounded to an integer to stay in minor units.

### 2. Average salary for a job title in a country

```sql
SELECT
  round(avg(salary))::int AS avg,
  count(*)               AS headcount
FROM employee
WHERE country_code = $1 AND job_title = $2;
```

Uses the composite `employee_country_job_idx` — the filter is satisfied straight from the index.

## Additional metrics for the HR manager

These go beyond the requirement because they answer questions Priya actually asks.

### 3. Median (50th percentile)

The **average is skewed by outliers** (one founder-level salary drags the mean up). The median is
often the number an HR manager should quote.

```sql
SELECT
  percentile_cont(0.5) WITHIN GROUP (ORDER BY salary)::int AS median
FROM employee
WHERE country_code = $1;
```

`percentile_cont` is a native ordered-set aggregate — exact, no client-side sorting.

### 4. Headcount by country (org map)

```sql
SELECT country_code, count(*) AS headcount, round(avg(salary))::int AS avg
FROM employee
GROUP BY country_code
ORDER BY headcount DESC;
```

Powers the dashboard's "where are our people, and what do they cost" view.

### 5. Top-paying job titles

```sql
SELECT job_title, round(avg(salary))::int AS avg, count(*) AS headcount
FROM employee
WHERE ($1::text IS NULL OR country_code = $1)
GROUP BY job_title
HAVING count(*) >= 3            -- ignore tiny, noisy groups
ORDER BY avg DESC
LIMIT $2;
```

The `HAVING count(*) >= 3` guard prevents a single highly-paid person from topping the chart as a
"job title" of one — a small but important correctness detail for averages.

### 6. Salary distribution (histogram)

```sql
SELECT width_bucket(salary, 0, 30000000, 10) AS bucket, count(*)
FROM employee
WHERE country_code = $1
GROUP BY bucket
ORDER BY bucket;
```

Lets the UI render a distribution chart so Priya sees *shape*, not just a single number.

`★ Insight ─────────────────────────────────────`
- **Mean vs. median is a product decision, not just a stat.** Reporting only the average would
  mislead the persona whenever compensation is skewed (it usually is). Shipping both — cheaply,
  via `percentile_cont` — is what makes the tool *trustworthy*, which was a stated non-functional goal.
- **Push computation to the data.** A 10k-row `AVG`/`percentile_cont` in Postgres returns in
  single-digit milliseconds and transfers a handful of numbers. The same logic in JS would
  transfer ~10k rows per request and re-implement statistics — slower, costlier, and easier to
  get wrong.
`─────────────────────────────────────────────────`

## A note on currency

Salaries carry a `currency`. Averaging across mixed currencies is meaningless ("avg of €80k and
$90k" is nonsense). The tool handles this honestly:

- Per-country insights are typically **single-currency** in practice, so we return the country's
  dominant currency alongside the figures.
- Where a group spans currencies, the API returns a `mixedCurrency: true` flag and the UI labels
  the number as approximate. **Normalizing via FX rates is a 🔭 considered, deferred feature** —
  it needs a rate source and a chosen base currency, which is out of scope for the minimal tool.

## Caching

Insight queries are read-only and change only when the roster changes. TanStack Query caches them
on the client; any employee mutation invalidates the `insights.*` query keys so numbers refresh.
Server-side caching is unnecessary at this scale.
