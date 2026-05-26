import { createRouterClient } from "@orpc/server";
import { testDb } from "@salary-management-system/db/test/client";

import type { Context } from "../context";
import { appRouter } from "../routers/index";

const now = new Date();

const authedSession = {
  user: {
    id: "test-user",
    name: "Test HR Manager",
    email: "hr@example.com",
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  },
  session: {
    id: "test-session",
    userId: "test-user",
    token: "test-token",
    expiresAt: new Date(now.getTime() + 86_400_000),
    createdAt: now,
    updatedAt: now,
  },
} as unknown as Context["session"];

export function createTestCaller(session: Context["session"] = authedSession) {
  return createRouterClient(appRouter, {
    context: { db: testDb, session },
  });
}
