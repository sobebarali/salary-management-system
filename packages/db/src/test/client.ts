import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../schema";

const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:password@localhost:5432/salary_management_test";

export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;

const pool = new Pool({ connectionString: testDatabaseUrl });

export const testDb = drizzle(pool, { schema });

export function closeTestDb(): Promise<void> {
  return pool.end();
}
