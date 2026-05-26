import { employee } from "@salary-management-system/db/schema/employee";

import { protectedProcedure } from "../index";
import { employeeInput } from "../schemas/employee";

export const employeesRouter = {
  create: protectedProcedure
    .input(employeeInput)
    .handler(async ({ context, input }) => {
      const [row] = await context.db.insert(employee).values(input).returning();

      return row;
    }),
};
