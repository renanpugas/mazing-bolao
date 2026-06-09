import { auth } from "@mazing-bolao/auth";
import { db, user } from "@mazing-bolao/db";
import { fromNodeHeaders } from "better-auth/node";
import { eq, sql } from "drizzle-orm";
import type { Request } from "express";

interface CreateContextOptions {
  req: Request;
}

export async function createContext(opts: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(opts.req.headers),
  });
  if (session?.user) {
    await ensureAtLeastOneAdmin(session.user.id);
  }
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

async function ensureAtLeastOneAdmin(userId: string) {
  const adminExists = await db.query.user.findFirst({
    where: eq(user.isAdmin, true),
    columns: { id: true },
  });

  if (adminExists) return;

  const result = await db
    .update(user)
    .set({ isAdmin: true, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id });

  if (result[0]) return;

  await db.run(sql`
    update user
    set is_admin = 1, updated_at = cast(unixepoch('subsecond') * 1000 as integer)
    where id = (
      select id from user order by created_at asc limit 1
    )
  `);
}
