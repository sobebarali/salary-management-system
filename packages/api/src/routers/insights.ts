import { employee } from "@salary-management-system/db/schema/employee";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { countryCode } from "../schemas/employee";

export const insightsRouter = {
  byCountry: protectedProcedure
    .input(z.object({ country: countryCode }))
    .handler(async ({ context, input }) => {
      const [row] = await context.db
        .select({
          min: sql<number | null>`min(${employee.salary})::int`,
          max: sql<number | null>`max(${employee.salary})::int`,
          avg: sql<number | null>`round(avg(${employee.salary}))::int`,
          median: sql<
            number | null
          >`percentile_cont(0.5) within group (order by ${employee.salary})::int`,
          headcount: sql<number>`count(*)::int`,
        })
        .from(employee)
        .where(eq(employee.countryCode, input.country));

      return row;
    }),

  jobTitleInCountry: protectedProcedure
    .input(z.object({ country: countryCode, jobTitle: z.string().min(1) }))
    .handler(async ({ context, input }) => {
      const [row] = await context.db
        .select({
          avg: sql<number | null>`round(avg(${employee.salary}))::int`,
          median: sql<
            number | null
          >`percentile_cont(0.5) within group (order by ${employee.salary})::int`,
          headcount: sql<number>`count(*)::int`,
        })
        .from(employee)
        .where(
          and(
            eq(employee.countryCode, input.country),
            eq(employee.jobTitle, input.jobTitle)
          )
        );

      return row;
    }),

  overview: protectedProcedure.handler(async ({ context }) => {
    const [row] = await context.db
      .select({
        totalEmployees: sql<number>`count(*)::int`,
        countries: sql<number>`count(distinct ${employee.countryCode})::int`,
        currency: sql<
          string | null
        >`mode() within group (order by ${employee.currency})`,
      })
      .from(employee);

    return row;
  }),

  salaryByCountry: protectedProcedure.handler(
    async ({ context }) =>
      await context.db
        .select({
          country: employee.countryCode,
          avg: sql<number>`round(avg(${employee.salary}))::int`,
          headcount: sql<number>`count(*)::int`,
        })
        .from(employee)
        .groupBy(employee.countryCode)
        .orderBy(sql`count(*) desc`)
  ),

  topJobTitles: protectedProcedure
    .input(
      z.object({
        country: countryCode.optional(),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .handler(
      async ({ context, input }) =>
        await context.db
          .select({
            jobTitle: employee.jobTitle,
            avg: sql<number>`round(avg(${employee.salary}))::int`,
            headcount: sql<number>`count(*)::int`,
          })
          .from(employee)
          .where(
            input.country ? eq(employee.countryCode, input.country) : undefined
          )
          .groupBy(employee.jobTitle)
          .having(sql`count(*) >= 3`)
          .orderBy(sql`round(avg(${employee.salary})) desc`)
          .limit(input.limit)
    ),
};
