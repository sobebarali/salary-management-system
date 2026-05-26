import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { Client } from "pg";

const E2E_DB = "salary_management_e2e";
const HOST = "postgresql://sobebarali@127.0.0.1:5432";
const ADMIN_URL = `${HOST}/postgres`;
const E2E_URL = `${HOST}/${E2E_DB}`;

export default async function globalSetup() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  const existing = await admin.query(
    "select 1 from pg_database where datname = $1",
    [E2E_DB]
  );
  if (existing.rowCount === 0) {
    await admin.query(`create database ${E2E_DB}`);
  }
  await admin.end();

  execFileSync(
    "bun",
    ["run", "--filter", "@salary-management-system/db", "db:push"],
    {
      cwd: resolve(process.cwd(), "../.."),
      env: { ...process.env, DATABASE_URL: E2E_URL },
      stdio: "inherit",
    }
  );

  const db = new Client({ connectionString: E2E_URL });
  await db.connect();
  await db.query(
    'truncate table "employee", "user", "session", "account", "verification" restart identity cascade'
  );
  await db.end();
}
