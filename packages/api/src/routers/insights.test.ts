import { employee } from "@salary-management-system/db/schema/employee";
import { closeTestDb, testDb } from "@salary-management-system/db/test/client";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { createTestCaller } from "../test/caller";

const roster = [
  {
    firstName: "Mara",
    lastName: "Koenig",
    jobTitle: "Manager",
    countryCode: "DE",
    salary: 12_000_000,
    currency: "EUR",
  },
  {
    firstName: "Lukas",
    lastName: "Bauer",
    jobTitle: "Manager",
    countryCode: "DE",
    salary: 13_000_000,
    currency: "EUR",
  },
  {
    firstName: "Sofia",
    lastName: "Wagner",
    jobTitle: "Manager",
    countryCode: "DE",
    salary: 14_000_000,
    currency: "EUR",
  },
  {
    firstName: "Ava",
    lastName: "Patel",
    jobTitle: "Analyst",
    countryCode: "US",
    salary: 8_000_000,
    currency: "USD",
  },
  {
    firstName: "Liam",
    lastName: "Nguyen",
    jobTitle: "Analyst",
    countryCode: "US",
    salary: 8_000_000,
    currency: "USD",
  },
  {
    firstName: "Noah",
    lastName: "Garcia",
    jobTitle: "Analyst",
    countryCode: "US",
    salary: 8_000_000,
    currency: "USD",
  },
  {
    firstName: "Mia",
    lastName: "Johnson",
    jobTitle: "Engineer",
    countryCode: "US",
    salary: 10_000_000,
    currency: "USD",
  },
  {
    firstName: "Ethan",
    lastName: "Brown",
    jobTitle: "Engineer",
    countryCode: "US",
    salary: 14_000_000,
    currency: "USD",
  },
];

const caller = createTestCaller();

describe("insights router", () => {
  beforeEach(async () => {
    await testDb.delete(employee);
    await testDb.insert(employee).values(roster);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("byCountry", () => {
    it("returns min/max/avg/median/headcount for a country", async () => {
      const us = await caller.insights.byCountry({ country: "US" });

      expect(us).toEqual({
        min: 8_000_000,
        max: 14_000_000,
        avg: 9_600_000,
        median: 8_000_000,
        headcount: 5,
      });
    });

    it("computes the median from the ordered set, not the mean", async () => {
      const de = await caller.insights.byCountry({ country: "DE" });

      expect(de).toEqual({
        min: 12_000_000,
        max: 14_000_000,
        avg: 13_000_000,
        median: 13_000_000,
        headcount: 3,
      });
    });

    it("lower-cased input is normalized before the lookup", async () => {
      const us = await caller.insights.byCountry({ country: "us" });

      expect(us.headcount).toBe(5);
    });
  });

  describe("jobTitleInCountry", () => {
    it("returns avg/median/headcount for a job title within a country", async () => {
      const analysts = await caller.insights.jobTitleInCountry({
        country: "US",
        jobTitle: "Analyst",
      });

      expect(analysts).toEqual({
        avg: 8_000_000,
        median: 8_000_000,
        headcount: 3,
      });
    });

    it("reports a zero headcount when the pairing has no employees", async () => {
      const result = await caller.insights.jobTitleInCountry({
        country: "US",
        jobTitle: "Manager",
      });

      expect(result.headcount).toBe(0);
    });
  });
});
