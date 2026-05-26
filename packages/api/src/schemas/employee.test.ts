import { describe, expect, it } from "vitest";

import { employeeInput, listInput, updateEmployeeInput } from "./employee";

const validEmployee = {
  firstName: "Ada",
  lastName: "Lovelace",
  jobTitle: "Software Engineer",
  countryCode: "GB",
  salary: 7_500_000,
};

describe("employeeInput", () => {
  it("applies the documented defaults", () => {
    const parsed = employeeInput.parse(validEmployee);

    expect(parsed.currency).toBe("USD");
    expect(parsed.employmentType).toBe("full_time");
  });

  it("normalizes a two-letter country code to upper case", () => {
    const parsed = employeeInput.parse({ ...validEmployee, countryCode: "de" });

    expect(parsed.countryCode).toBe("DE");
  });

  it("rejects a country code that is not two letters", () => {
    expect(
      employeeInput.safeParse({ ...validEmployee, countryCode: "DEU" }).success
    ).toBe(false);
  });

  it("rejects an empty first name", () => {
    expect(
      employeeInput.safeParse({ ...validEmployee, firstName: "" }).success
    ).toBe(false);
  });

  it("rejects a negative salary", () => {
    expect(
      employeeInput.safeParse({ ...validEmployee, salary: -1 }).success
    ).toBe(false);
  });

  it("rejects a fractional salary (minor units are integers)", () => {
    expect(
      employeeInput.safeParse({ ...validEmployee, salary: 100.5 }).success
    ).toBe(false);
  });
});

describe("listInput", () => {
  it("defaults page, pageSize, and sort", () => {
    const parsed = listInput.parse({});

    expect(parsed.page).toBe(1);
    expect(parsed.pageSize).toBe(25);
    expect(parsed.sort).toBe("name_asc");
  });

  it("caps pageSize at 100", () => {
    expect(listInput.safeParse({ pageSize: 101 }).success).toBe(false);
  });
});

describe("updateEmployeeInput", () => {
  it("does not inject defaults for omitted fields", () => {
    const parsed = updateEmployeeInput.parse({
      id: "00000000-0000-0000-0000-000000000000",
      salary: 9_000_000,
    });

    expect(parsed).not.toHaveProperty("currency");
    expect(parsed).not.toHaveProperty("employmentType");
  });
});
