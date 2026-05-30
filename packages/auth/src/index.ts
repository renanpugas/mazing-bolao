import { createDb } from "@mazing-bolao/db";
import * as schema from "@mazing-bolao/db/schema/auth";
import { env } from "@mazing-bolao/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
  const db = createDb();
  const isTestEnv = process.env.NODE_ENV === "test";
  const authBaseUrl = env.BETTER_AUTH_URL.replace(/\/api\/auth\/?$/, "");
  const googleRedirectURI = `${authBaseUrl}/api/auth/callback/google`;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: false,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectURI: googleRedirectURI,
      },
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
