import { createDb } from "@mazing-bolao/db";
import * as schema from "@mazing-bolao/db/schema/auth";
import { env } from "@mazing-bolao/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
  const db = createDb();
  const isTestEnv = process.env.NODE_ENV === "test";

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: isTestEnv ? "lax" : "none",
        secure: !isTestEnv,
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export const auth = createAuth();
