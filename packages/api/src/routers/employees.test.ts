import { employee } from "@salary-management-system/db/schema/employee";
import { closeTestDb, testDb } from "@salary-management-system/db/test/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createTestCaller } from "../test/caller";

const caller = createTestCaller();

const validInput = {
  firstName: "Ada",
  lastName: "Lovelace",
  jobTitle: "Software Engineer",
  countryCode: "GB",
  salary: 7_500_000,
};

describe("employees router", () => {
  beforeEach(async () => {
    await testDb.delete(employee);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("create", () => {
    it("inserts an employee and returns the row with defaults applied", async () => {
      const row = await caller.employees.create(validInput);

      expect(row.id).toEqual(expect.any(String));
      expect(row.firstName).toBe("Ada");
      expect(row.salary).toBe(7_500_000);
      expect(row.currency).toBe("USD");
      expect(row.employmentType).toBe("full_time");
    });
  });

  describe("get", () => {
    it("returns the employee by id", async () => {
      const created = await caller.employees.create(validInput);

      const fetched = await caller.employees.get({ id: created.id });

      expect(fetched).toEqual(created);
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expect(
        caller.employees.get({ id: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("update", () => {
    it("patches only the provided fields, leaving the rest untouched", async () => {
      const created = await caller.employees.create({
        ...validInput,
        currency: "EUR",
      });

      const updated = await caller.employees.update({
        id: created.id,
        salary: 9_000_000,
      });

      expect(updated.salary).toBe(9_000_000);
      expect(updated.currency).toBe("EUR");
      expect(updated.firstName).toBe("Ada");
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expect(
        caller.employees.update({
          id: "00000000-0000-0000-0000-000000000000",
          salary: 1,
        })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("delete", () => {
    it("removes the employee and returns its id", async () => {
      const created = await caller.employees.create(validInput);

      const result = await caller.employees.delete({ id: created.id });

      expect(result).toEqual({ id: created.id });
      await expect(
        caller.employees.get({ id: created.id })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws NOT_FOUND for an unknown id", async () => {
      await expect(
        caller.employees.delete({ id: "00000000-0000-0000-0000-000000000000" })
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  describe("list", () => {
    const listRoster = [
      {
        firstName: "Ana",
        lastName: "Adams",
        jobTitle: "Engineer",
        countryCode: "US",
        salary: 5_000_000,
        currency: "USD",
      },
      {
        firstName: "Ben",
        lastName: "Brown",
        jobTitle: "Engineer",
        countryCode: "US",
        salary: 9_000_000,
        currency: "USD",
      },
      {
        firstName: "Cara",
        lastName: "Clark",
        jobTitle: "Manager",
        countryCode: "US",
        salary: 12_000_000,
        currency: "USD",
      },
      {
        firstName: "Dirk",
        lastName: "Diaz",
        jobTitle: "Engineer",
        countryCode: "DE",
        salary: 7_000_000,
        currency: "EUR",
      },
      {
        firstName: "Eve",
        lastName: "Evans",
        jobTitle: "Manager",
        countryCode: "DE",
        salary: 11_000_000,
        currency: "EUR",
      },
    ];

    beforeEach(async () => {
      await testDb.insert(employee).values(listRoster);
    });

    it("returns the first page ordered by name with a total count", async () => {
      const result = await caller.employees.list({});

      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
      expect(result.rows).toHaveLength(5);
      expect(result.rows[0]?.lastName).toBe("Adams");
    });

    it("filters by country", async () => {
      const result = await caller.employees.list({ country: "DE" });

      expect(result.total).toBe(2);
      expect(result.rows.every((r) => r.countryCode === "DE")).toBe(true);
    });

    it("filters by job title", async () => {
      const result = await caller.employees.list({ jobTitle: "Manager" });

      expect(result.total).toBe(2);
    });

    it("searches first and last name case-insensitively", async () => {
      const result = await caller.employees.list({ search: "bro" });

      expect(result.total).toBe(1);
      expect(result.rows[0]?.lastName).toBe("Brown");
    });

    it("sorts by salary descending", async () => {
      const result = await caller.employees.list({ sort: "salary_desc" });

      expect(result.rows[0]?.salary).toBe(12_000_000);
    });

    it("paginates with limit and offset", async () => {
      const result = await caller.employees.list({ page: 2, pageSize: 2 });

      expect(result.total).toBe(5);
      expect(result.page).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]?.lastName).toBe("Clark");
    });
  });
});
