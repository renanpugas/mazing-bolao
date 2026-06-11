import { createDb } from "@mazing-bolao/db";
import { passwordLoginAuthorization } from "@mazing-bolao/db/schema/auth";
import * as schema from "@mazing-bolao/db/schema/auth";
import { env } from "@mazing-bolao/env/server";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, isNull } from "drizzle-orm";

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

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
      enabled: true,
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
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;

        const body = ctx.body as { email?: unknown } | undefined;
        const email = normalizeEmail(body?.email);
        if (!email) {
          throw new APIError("BAD_REQUEST", {
            message: "Informe um e-mail válido.",
          });
        }

        if (body) {
          body.email = email;
        }

        const authorization = await db.query.passwordLoginAuthorization.findFirst({
          where: and(eq(passwordLoginAuthorization.email, email), isNull(passwordLoginAuthorization.revokedAt)),
          columns: {
            id: true,
            usedAt: true,
            usedByUserId: true,
          },
        });

        if (!authorization) {
          throw new APIError("FORBIDDEN", {
            message: "Este e-mail não está autorizado para cadastro com senha.",
          });
        }

        if (authorization.usedAt || authorization.usedByUserId) {
          throw new APIError("FORBIDDEN", {
            message: "Esta autorização de cadastro já foi utilizada.",
          });
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;

        const body = ctx.body as { email?: unknown } | undefined;
        const email = normalizeEmail(body?.email);
        const userId = ctx.context.newSession?.user.id;

        if (!email || !userId) return;

        await db
          .update(passwordLoginAuthorization)
          .set({ usedByUserId: userId, usedAt: new Date() })
          .where(
            and(
              eq(passwordLoginAuthorization.email, email),
              isNull(passwordLoginAuthorization.usedAt),
              isNull(passwordLoginAuthorization.revokedAt),
            ),
          );
      }),
    },
    plugins: [],
  });
}

export const auth = createAuth();
