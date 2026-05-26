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
});
