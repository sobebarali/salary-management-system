import { ORPCError } from "@orpc/server";
import { employee } from "@salary-management-system/db/schema/employee";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { employeeId, employeeInput } from "../schemas/employee";

export const employeesRouter = {
  create: protectedProcedure
    .input(employeeInput)
    .handler(async ({ context, input }) => {
      const [row] = await context.db.insert(employee).values(input).returning();

      return row;
    }),

  get: protectedProcedure
    .input(z.object({ id: employeeId }))
    .handler(async ({ context, input }) => {
      const [row] = await context.db
        .select()
        .from(employee)
        .where(eq(employee.id, input.id));

      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }

      return row;
    }),
};
