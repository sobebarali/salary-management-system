import { ORPCError } from "@orpc/server";
import { employee } from "@salary-management-system/db/schema/employee";
import { and, asc, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  employeeId,
  employeeInput,
  listInput,
  updateEmployeeInput,
} from "../schemas/employee";

const orderByForSort = {
  salary_asc: [asc(employee.salary)],
  salary_desc: [desc(employee.salary)],
  name_asc: [asc(employee.lastName), asc(employee.firstName)],
  name_desc: [desc(employee.lastName), desc(employee.firstName)],
} as const;

export const employeesRouter = {
  list: protectedProcedure
    .input(listInput)
    .handler(async ({ context, input }) => {
      const conditions: SQL[] = [];
      if (input.country) {
        conditions.push(eq(employee.countryCode, input.country));
      }
      if (input.jobTitle) {
        conditions.push(eq(employee.jobTitle, input.jobTitle));
      }
      if (input.search) {
        const term = `%${input.search}%`;
        conditions.push(
          or(
            ilike(employee.firstName, term),
            ilike(employee.lastName, term)
          ) as SQL
        );
      }
      const where = conditions.length ? and(...conditions) : undefined;

      const rows = await context.db
        .select()
        .from(employee)
        .where(where)
        .orderBy(...orderByForSort[input.sort])
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const [counted] = await context.db
        .select({ total: sql<number>`count(*)::int` })
        .from(employee)
        .where(where);

      return {
        rows,
        total: counted?.total ?? 0,
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  create: protectedProcedure
    .input(employeeInput)
    .handler(async ({ context, input }) => {
      const [row] = await context.db.insert(employee).values(input).returning();

      if (!row) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
      }

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

  update: protectedProcedure
    .input(updateEmployeeInput)
    .handler(async ({ context, input }) => {
      const { id, ...patch } = input;

      const [row] = await context.db
        .update(employee)
        .set(patch)
        .where(eq(employee.id, id))
        .returning();

      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }

      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: employeeId }))
    .handler(async ({ context, input }) => {
      const [row] = await context.db
        .delete(employee)
        .where(eq(employee.id, input.id))
        .returning({ id: employee.id });

      if (!row) {
        throw new ORPCError("NOT_FOUND");
      }

      return row;
    }),
};
