import { describe, expect, it } from "vitest";

import { formatMoney, toMajorUnits, toMinorUnits } from "./money";

describe("toMinorUnits", () => {
  it("converts a major-unit string to integer minor units", () => {
    expect(toMinorUnits("75000.00")).toBe(7_500_000);
  });

  it("accepts a plain number", () => {
    expect(toMinorUnits(75_000)).toBe(7_500_000);
  });

  it("rounds to the nearest minor unit without float drift", () => {
    expect(toMinorUnits("19.99")).toBe(1999);
  });
});

describe("toMajorUnits", () => {
  it("converts integer minor units back to major units", () => {
    expect(toMajorUnits(7_500_000)).toBe(75_000);
  });

  it("preserves the fractional part", () => {
    expect(toMajorUnits(1999)).toBe(19.99);
  });
});

describe("formatMoney", () => {
  it("formats minor units as a localized currency string", () => {
    expect(formatMoney(7_500_000, "USD")).toBe("$75,000.00");
  });

  it("respects the given currency", () => {
    expect(formatMoney(1999, "EUR")).toBe("€19.99");
  });
});
