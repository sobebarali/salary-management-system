import { env } from "@salary-management-system/env/server";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export function createDb() {
  return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
