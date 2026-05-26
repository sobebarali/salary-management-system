import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { employee } from "../schema";
import { closeTestDb, testDb } from "./client";

const validEmployee = {
  firstName: "Ada",
  lastName: "Lovelace",
  jobTitle: "Software Engineer",
  countryCode: "GB",
  salary: 7_500_000,
};

describe("employee table", () => {
  beforeEach(async () => {
    await testDb.delete(employee);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("stores salary as an exact integer and applies the documented defaults", async () => {
    const [row] = await testDb
      .insert(employee)
      .values(validEmployee)
      .returning();

    expect(row).toBeDefined();
    expect(row?.salary).toBe(7_500_000);
    expect(typeof row?.salary).toBe("number");
    expect(row?.currency).toBe("USD");
    expect(row?.employmentType).toBe("full_time");
    expect(row?.createdAt).toBeInstanceOf(Date);
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects a duplicate email", async () => {
    const email = "ada@example.com";
    await testDb.insert(employee).values({ ...validEmployee, email });

    await expect(
      testDb
        .insert(employee)
        .values({ ...validEmployee, email, firstName: "Grace" })
    ).rejects.toThrow();
  });

  it("rejects an employment_type outside the enum", async () => {
    await expect(
      testDb.execute(
        sql`INSERT INTO employee (first_name, last_name, job_title, country_code, salary, employment_type)
            VALUES ('Alan', 'Turing', 'Researcher', 'GB', 100, 'freelance')`
      )
    ).rejects.toThrow();
  });

  it("creates the indexes the insight queries rely on", async () => {
    const result = await testDb.execute(
      sql`SELECT indexname FROM pg_indexes WHERE tablename = 'employee'`
    );
    const indexNames = result.rows.map((r) => String(r.indexname));

    expect(indexNames).toEqual(
      expect.arrayContaining([
        "employee_country_idx",
        "employee_country_job_idx",
        "employee_job_idx",
      ])
    );
  });
});
