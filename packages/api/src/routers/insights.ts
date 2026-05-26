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
};
