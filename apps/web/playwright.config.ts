import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 3001;
const SERVER_PORT = 3000;
const E2E_DATABASE_URL =
  "postgresql://sobebarali@127.0.0.1:5432/salary_management_e2e";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun run dev",
      cwd: "../server",
      port: SERVER_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { DATABASE_URL: E2E_DATABASE_URL },
    },
    {
      command: "bun run dev",
      port: WEB_PORT,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
