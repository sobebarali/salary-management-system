import { describe, expect, it } from "vitest";

import { generateEmployees, mulberry32 } from "../seed";

const COUNTRY_CODE = /^[A-Z]{2}$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

describe("mulberry32", () => {
  it("yields the same sequence for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);

    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});

describe("generateEmployees", () => {
  it("produces the requested number of rows", () => {
    expect(generateEmployees(2500, 42)).toHaveLength(2500);
  });

  it("is reproducible for a fixed seed and varies by seed", () => {
    expect(generateEmployees(50, 42)).toEqual(generateEmployees(50, 42));
    expect(generateEmployees(50, 1)).not.toEqual(generateEmployees(50, 42));
  });

  it("emits rows that satisfy the employee schema invariants", () => {
    const employmentTypes = new Set([
      "full_time",
      "part_time",
      "contract",
      "intern",
    ]);

    for (const row of generateEmployees(200, 7)) {
      expect(row.firstName.length).toBeGreaterThan(0);
      expect(row.lastName.length).toBeGreaterThan(0);
      expect(row.countryCode).toMatch(COUNTRY_CODE);
      expect(row.currency).toMatch(CURRENCY_CODE);
      expect(Number.isInteger(row.salary)).toBe(true);
      expect(row.salary).toBeGreaterThan(0);
      expect(employmentTypes.has(row.employmentType)).toBe(true);
    }
  });

  it("draws a right-skewed salary spread so the mean exceeds the median", () => {
    const salaries = generateEmployees(2000, 3)
      .map((r) => r.salary)
      .sort((a, b) => a - b);
    const mean = salaries.reduce((sum, v) => sum + v, 0) / salaries.length;
    const median = salaries[Math.floor(salaries.length / 2)] ?? 0;

    expect(mean).toBeGreaterThan(median);
  });
});
