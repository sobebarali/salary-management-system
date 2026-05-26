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
});
