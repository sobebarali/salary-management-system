import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Database } from "./index";
import { employee } from "./schema/employee";

const here = dirname(fileURLToPath(import.meta.url));
const NEWLINE = /\r?\n/;

function loadNames(file: string): string[] {
  return readFileSync(join(here, "seed-data", file), "utf8")
    .trim()
    .split(NEWLINE);
}

const firstNames = loadNames("first_names.txt");
const lastNames = loadNames("last_names.txt");

const COUNTRIES = [
  { code: "US", currency: "USD" },
  { code: "GB", currency: "GBP" },
  { code: "DE", currency: "EUR" },
  { code: "FR", currency: "EUR" },
  { code: "IN", currency: "INR" },
  { code: "CA", currency: "CAD" },
  { code: "AU", currency: "AUD" },
  { code: "JP", currency: "JPY" },
  { code: "BR", currency: "BRL" },
  { code: "SG", currency: "SGD" },
] as const;

const JOB_TITLES = [
  { title: "Software Engineer", base: 9_000_000 },
  { title: "Senior Software Engineer", base: 13_000_000 },
  { title: "Engineering Manager", base: 16_000_000 },
  { title: "Product Manager", base: 12_000_000 },
  { title: "Data Analyst", base: 7_500_000 },
  { title: "Data Scientist", base: 11_000_000 },
  { title: "Designer", base: 8_000_000 },
  { title: "Sales Representative", base: 6_500_000 },
  { title: "Account Executive", base: 9_500_000 },
  { title: "Support Specialist", base: 5_000_000 },
  { title: "Recruiter", base: 6_000_000 },
  { title: "Finance Analyst", base: 8_500_000 },
] as const;

const DEPARTMENTS = [
  "Engineering",
  "Product",
  "Design",
  "Sales",
  "Marketing",
  "Finance",
  "People",
  "Support",
] as const;

const EMPLOYMENT_TYPES = [
  "full_time",
  "full_time",
  "full_time",
  "full_time",
  "part_time",
  "contract",
  "intern",
] as const;

const HIRE_ANCHOR = Date.UTC(2025, 0, 1);
const DAY_MS = 86_400_000;
const MAX_TENURE_DAYS = 365 * 8;
const SKEW_PROBABILITY = 0.08;

// biome-ignore-start lint/suspicious/noBitwiseOperators: mulberry32 is a bitwise PRNG by definition
export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d_2b_79_f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
// biome-ignore-end lint/suspicious/noBitwiseOperators: end PRNG

function pick<T>(items: readonly T[], rng: () => number): T {
  const value = items[Math.floor(rng() * items.length)];
  if (value === undefined) {
    throw new Error("Cannot pick from an empty list");
  }
  return value;
}

function makeSalary(base: number, rng: () => number): number {
  const jittered = base * (0.8 + rng() * 0.4);
  const skewed =
    rng() < SKEW_PROBABILITY ? jittered * (1.5 + rng() * 2) : jittered;
  return Math.round(skewed);
}

function makeHireDate(rng: () => number): string {
  const daysAgo = Math.floor(rng() * MAX_TENURE_DAYS);
  return new Date(HIRE_ANCHOR - daysAgo * DAY_MS).toISOString().slice(0, 10);
}

export interface EmployeeSeed {
  countryCode: string;
  currency: string;
  department: string;
  employmentType: (typeof EMPLOYMENT_TYPES)[number];
  firstName: string;
  hireDate: string;
  jobTitle: string;
  lastName: string;
  salary: number;
}

function makeEmployee(rng: () => number): EmployeeSeed {
  const job = pick(JOB_TITLES, rng);
  const country = pick(COUNTRIES, rng);
  return {
    firstName: pick(firstNames, rng),
    lastName: pick(lastNames, rng),
    jobTitle: job.title,
    countryCode: country.code,
    salary: makeSalary(job.base, rng),
    currency: country.currency,
    department: pick(DEPARTMENTS, rng),
    employmentType: pick(EMPLOYMENT_TYPES, rng),
    hireDate: makeHireDate(rng),
  };
}

export function generateEmployees(count: number, seed: number): EmployeeSeed[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => makeEmployee(rng));
}

const TOTAL = 10_000;
const CHUNK = 1000;
const DEFAULT_SEED = 42;

export async function seedDatabase(
  database: Database,
  { count = TOTAL, seed = DEFAULT_SEED }: { count?: number; seed?: number } = {}
): Promise<number> {
  const rows = generateEmployees(count, seed);

  await database.transaction(async (tx) => {
    await tx.delete(employee);
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tx.insert(employee).values(rows.slice(i, i + CHUNK));
    }
  });

  return rows.length;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const { config } = await import("dotenv");
  config({ path: "../../apps/server/.env" });
  const { db } = await import("./index");
  const seeded = await seedDatabase(db);
  console.log(`Seeded ${seeded} employees.`);
  process.exit(0);
}
