import { auth } from "@mazing-bolao/auth";
import { db, user } from "@mazing-bolao/db";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import type { Request } from "express";

interface CreateContextOptions {
  req: Request;
}

export async function createContext(opts: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });
  const currentUser = session?.user
    ? await db.query.user.findFirst({
        where: eq(user.id, session.user.id),
        columns: { isAdmin: true },
      })
    : null;

  return {
    auth: null,
    session: session
      ? {
          ...session,
          user: {
            ...session.user,
            isAdmin: currentUser?.isAdmin ?? false,
          },
        }
      : session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
