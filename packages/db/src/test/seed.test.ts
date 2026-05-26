import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { employee } from "../schema";
import { seedDatabase } from "../seed";
import { closeTestDb, testDb } from "./client";

async function employeeCount(): Promise<number> {
  const [row] = await testDb
    .select({ n: sql<number>`count(*)::int` })
    .from(employee);
  return row?.n ?? 0;
}

describe("seedDatabase", () => {
  beforeEach(async () => {
    await testDb.delete(employee);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("inserts the requested number of employees", async () => {
    const inserted = await seedDatabase(testDb, { count: 50, seed: 42 });

    expect(inserted).toBe(50);
    expect(await employeeCount()).toBe(50);
  });

  it("is idempotent — re-running clears first instead of doubling", async () => {
    await seedDatabase(testDb, { count: 50, seed: 42 });
    await seedDatabase(testDb, { count: 50, seed: 42 });

    expect(await employeeCount()).toBe(50);
  });

  it("clears pre-existing rows before seeding", async () => {
    await testDb.insert(employee).values({
      firstName: "Stale",
      lastName: "Row",
      jobTitle: "Placeholder",
      countryCode: "US",
      salary: 1,
    });

    await seedDatabase(testDb, { count: 10, seed: 1 });
    const rows = await testDb.select().from(employee);

    expect(rows).toHaveLength(10);
    expect(rows.some((r) => r.firstName === "Stale")).toBe(false);
  });
});
