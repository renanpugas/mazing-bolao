import { db, passwordLoginAuthorization, user } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { requireAdmin } from "../permissions";

const userIdInput = z.object({
  userId: z.string().trim().min(1, "Usuário é obrigatório"),
});

const emailInput = z.object({
  email: z.string().trim().email("Informe um e-mail válido").transform((email) => email.toLowerCase()),
});

const authorizationIdInput = z.object({
  authorizationId: z.string().trim().min(1, "Autorização é obrigatória"),
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
  listPasswordAuthorizations: protectedProcedure.handler(async ({ context }) => {
    await requireAdmin(context.session.user.id);

    const authorizations = await db
      .select({
        id: passwordLoginAuthorization.id,
        email: passwordLoginAuthorization.email,
        createdByUserId: passwordLoginAuthorization.createdByUserId,
        usedByUserId: passwordLoginAuthorization.usedByUserId,
        revokedByUserId: passwordLoginAuthorization.revokedByUserId,
        createdAt: passwordLoginAuthorization.createdAt,
        usedAt: passwordLoginAuthorization.usedAt,
        revokedAt: passwordLoginAuthorization.revokedAt,
      })
      .from(passwordLoginAuthorization)
      .orderBy(desc(passwordLoginAuthorization.createdAt), asc(passwordLoginAuthorization.email));

    return authorizations.map(toPasswordAuthorizationDto);
  }),
  createPasswordAuthorization: protectedProcedure.input(emailInput).handler(async ({ context, input }) => {
    await requireAdmin(context.session.user.id);

    const existingUser = await db.query.user.findFirst({
      where: sql`lower(${user.email}) = ${input.email}`,
      columns: { id: true },
    });

    if (existingUser) {
      throw new ORPCError("CONFLICT", {
        message: "Já existe um usuário cadastrado com esse e-mail.",
      });
    }

    const existingAuthorization = await db.query.passwordLoginAuthorization.findFirst({
      where: eq(passwordLoginAuthorization.email, input.email),
    });

    if (existingAuthorization?.usedAt || existingAuthorization?.usedByUserId) {
      throw new ORPCError("CONFLICT", {
        message: "Esse e-mail já usou uma autorização de cadastro.",
      });
    }

    if (existingAuthorization && !existingAuthorization.revokedAt) {
      return toPasswordAuthorizationDto(existingAuthorization);
    }

    if (existingAuthorization) {
      const result = await db
        .update(passwordLoginAuthorization)
        .set({
          createdByUserId: context.session.user.id,
          createdAt: new Date(),
          revokedAt: null,
          revokedByUserId: null,
        })
        .where(eq(passwordLoginAuthorization.id, existingAuthorization.id))
        .returning();

      const renewedAuthorization = result[0];
      if (!renewedAuthorization) {
        throw new ORPCError("NOT_FOUND", {
          message: "Autorização não encontrada",
        });
      }

      return toPasswordAuthorizationDto(renewedAuthorization);
    }

    const result = await db
      .insert(passwordLoginAuthorization)
      .values({
        id: randomUUID(),
        email: input.email,
        createdByUserId: context.session.user.id,
      })
      .returning();

    const createdAuthorization = result[0];
    if (!createdAuthorization) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Não foi possível criar a autorização",
      });
    }

    return toPasswordAuthorizationDto(createdAuthorization);
  }),
  revokePasswordAuthorization: protectedProcedure.input(authorizationIdInput).handler(async ({ context, input }) => {
    await requireAdmin(context.session.user.id);

    const authorization = await db.query.passwordLoginAuthorization.findFirst({
      where: eq(passwordLoginAuthorization.id, input.authorizationId),
    });

    if (!authorization) {
      throw new ORPCError("NOT_FOUND", {
        message: "Autorização não encontrada",
      });
    }

    if (authorization.usedAt || authorization.usedByUserId) {
      throw new ORPCError("CONFLICT", {
        message: "Não é possível revogar uma autorização já utilizada.",
      });
    }

    if (authorization.revokedAt) {
      return toPasswordAuthorizationDto(authorization);
    }

    const result = await db
      .update(passwordLoginAuthorization)
      .set({ revokedAt: new Date(), revokedByUserId: context.session.user.id })
      .where(eq(passwordLoginAuthorization.id, input.authorizationId))
      .returning();

    const revokedAuthorization = result[0];
    if (!revokedAuthorization) {
      throw new ORPCError("NOT_FOUND", {
        message: "Autorização não encontrada",
      });
    }

    return toPasswordAuthorizationDto(revokedAuthorization);
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

type PasswordAuthorizationRow = typeof passwordLoginAuthorization.$inferSelect;

function toPasswordAuthorizationDto(authorization: PasswordAuthorizationRow) {
  return {
    ...authorization,
    status: authorization.revokedAt ? "revoked" : authorization.usedAt || authorization.usedByUserId ? "used" : "pending",
  } as const;
}
