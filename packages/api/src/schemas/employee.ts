import { z } from "zod";

export const countryCode = z.string().length(2).toUpperCase();

const employeeFields = {
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  jobTitle: z.string().min(1).max(120),
  countryCode,
  salary: z.number().int().nonnegative(),
  currency: z.string().length(3),
  department: z.string().max(120).optional(),
  email: z.email().optional(),
  employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),
  hireDate: z.iso.date().optional(),
};

export const employeeInput = z.object({
  ...employeeFields,
  currency: employeeFields.currency.default("USD"),
  employmentType: employeeFields.employmentType.default("full_time"),
});

export const listInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  country: countryCode.optional(),
  jobTitle: z.string().optional(),
  search: z.string().optional(),
  sort: z
    .enum(["salary_asc", "salary_desc", "name_asc", "name_desc"])
    .default("name_asc"),
});

export const employeeId = z.uuid();

export const updateEmployeeInput = z
  .object(employeeFields)
  .partial()
  .extend({ id: employeeId });

export type EmployeeInput = z.infer<typeof employeeInput>;
export type ListInput = z.infer<typeof listInput>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInput>;
