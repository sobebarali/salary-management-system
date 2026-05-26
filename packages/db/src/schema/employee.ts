import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const employmentType = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
  "intern",
]);

export const employee = pgTable(
  "employee",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    jobTitle: varchar("job_title", { length: 120 }).notNull(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    salary: integer("salary").notNull(),

    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    department: varchar("department", { length: 120 }),
    email: varchar("email", { length: 255 }).unique(),
    employmentType: employmentType("employment_type")
      .notNull()
      .default("full_time"),
    hireDate: date("hire_date"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    index("employee_country_idx").on(t.countryCode),
    index("employee_country_job_idx").on(t.countryCode, t.jobTitle),
    index("employee_job_idx").on(t.jobTitle),
  ]
);
