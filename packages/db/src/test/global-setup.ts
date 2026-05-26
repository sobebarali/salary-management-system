import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

import { testDatabaseUrl } from "./client";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(here, "../migrations");

const SAFE_IDENTIFIER = /^[a-zA-Z0-9_]+$/;

async function ensureDatabaseExists(): Promise<void> {
  const dbName = new URL(testDatabaseUrl).pathname.slice(1);
  if (!SAFE_IDENTIFIER.test(dbName)) {
    throw new Error(`Unsafe test database name: ${dbName}`);
  }

  const adminUrl = new URL(testDatabaseUrl);
  adminUrl.pathname = "/postgres";

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (!rowCount) {
      await admin.query(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.end();
  }
}

export default async function setup(): Promise<void> {
  await ensureDatabaseExists();

  if (!existsSync(migrationsFolder)) {
    return;
  }

  const pool = new Pool({ connectionString: testDatabaseUrl });
  try {
    await migrate(drizzle(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}
