import { createDb } from "@mazing-bolao/db";
import * as schema from "@mazing-bolao/db/schema/auth";
import { env } from "@mazing-bolao/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
  const db = createDb();
  const isProduction = env.NODE_ENV === "production";
  const authBaseUrl = env.BETTER_AUTH_URL.replace(/\/api\/auth\/?$/, "");
  const googleRedirectURI = `${authBaseUrl}/api/auth/callback/google`;

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "sqlite",

      schema: schema,
    }),
    trustedOrigins: [
      "http://localhost:*",
      "http://127.0.0.1:*",
      "http://[::1]:*",
      "http://192.168.15.11:*",
      "https://localhost:*",
      "https://127.0.0.1:*",
      "https://[::1]:*",
      "https://192.168.15.11:*",
    ],
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
      disableOriginCheck: true,
      disableCSRFCheck: true,
      defaultCookieAttributes: {
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export const auth = createAuth();
