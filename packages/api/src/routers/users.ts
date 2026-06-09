import { db, user } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { requireAdmin } from "../permissions";

const userIdInput = z.object({
  userId: z.string().trim().min(1, "Usuário é obrigatório"),
});

export const usersRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    await requireAdmin(context.session.user.id);

    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(asc(user.name), asc(user.email));
  }),
  makeAdmin: protectedProcedure.input(userIdInput).handler(async ({ context, input }) => {
    await requireAdmin(context.session.user.id);

    const updatedUser = await setUserAdmin(input.userId, true);
    return updatedUser;
  }),
  removeAdmin: protectedProcedure.input(userIdInput).handler(async ({ context, input }) => {
    await requireAdmin(context.session.user.id);

    if (input.userId === context.session.user.id) {
      throw new ORPCError("FORBIDDEN", {
        message: "Você não pode remover seu próprio acesso de admin",
      });
    }

    const updatedUser = await setUserAdmin(input.userId, false);
    return updatedUser;
  }),
};

async function setUserAdmin(userId: string, isAdmin: boolean) {
  const result = await db
    .update(user)
    .set({ isAdmin, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });

  const updatedUser = result[0];
  if (!updatedUser) {
    throw new ORPCError("NOT_FOUND", {
      message: "Usuário não encontrado",
    });
  }

  return updatedUser;
}
