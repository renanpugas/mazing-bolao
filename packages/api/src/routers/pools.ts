import { db, pool, poolQuestionAnswer, poolUser, prediction, tournament, user } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { requireAdmin, requirePoolManager, requirePoolParticipantOrAdmin } from "../permissions";

export const poolsRouter = {
  list: protectedProcedure.handler(async () => {
    return db
      .select({
        id: pool.id,
        name: pool.name,
        createdByUserId: pool.createdByUserId,
        tournamentId: pool.tournamentId,
        tournamentName: tournament.name,
        createdAt: pool.createdAt,
        updatedAt: pool.updatedAt,
      })
      .from(pool)
      .leftJoin(tournament, eq(tournament.id, pool.tournamentId))
      .orderBy(desc(pool.createdAt));
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1, "Nome é obrigatório").max(120),
        tournamentId: z.string().trim().min(1, "Torneio é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await requireAdmin(userId);

      const poolId = crypto.randomUUID();
      const newPool = {
        id: poolId,
        name: input.name,
        createdByUserId: userId,
        tournamentId: input.tournamentId,
      };

      const tournamentExists = await db.query.tournament.findFirst({
        where: eq(tournament.id, input.tournamentId),
        columns: { id: true },
      });

      if (!tournamentExists) {
        throw new ORPCError("NOT_FOUND", {
          message: "Torneio não encontrado",
        });
      }

      await db.insert(pool).values(newPool);
      await db.insert(poolUser).values({
        id: crypto.randomUUID(),
        poolId,
        userId,
      });

      return newPool;
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1, "Nome é obrigatório").max(120),
      }),
    )
    .handler(async ({ context, input }) => {
      await requirePoolManager(input.id, context.session.user.id);

      const result = await db
        .update(pool)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(pool.id, input.id))
        .returning({ id: pool.id, name: pool.name });

      const updatedPool = result[0];
      if (!updatedPool) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bolão não encontrado",
        });
      }

      return updatedPool;
    }),
  participants: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const currentPool = await requirePoolParticipantOrAdmin(input.poolId, context.session.user.id);

      const participants = await db
        .select({
          id: poolUser.id,
          poolId: poolUser.poolId,
          userId: poolUser.userId,
          createdAt: poolUser.createdAt,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
          },
        })
        .from(poolUser)
        .innerJoin(user, eq(user.id, poolUser.userId))
        .where(eq(poolUser.poolId, input.poolId))
        .orderBy(asc(user.name), asc(user.email));

      return {
        poolId: input.poolId,
        canManage: currentPool.canManage,
        participants,
      };
    }),
  addParticipant: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        email: z.string().trim().email("Informe um e-mail válido"),
      }),
    )
    .handler(async ({ context, input }) => {
      await requirePoolManager(input.poolId, context.session.user.id);

      const targetUser = await db.query.user.findFirst({
        where: eq(user.email, input.email),
        columns: { id: true, name: true, email: true },
      });

      if (!targetUser) {
        throw new ORPCError("NOT_FOUND", {
          message: "Usuário não encontrado",
        });
      }

      const existingParticipant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, targetUser.id)),
        columns: { id: true },
      });

      if (existingParticipant) {
        throw new ORPCError("CONFLICT", {
          message: "Usuário já participa desse bolão",
        });
      }

      const newParticipant = {
        id: crypto.randomUUID(),
        poolId: input.poolId,
        userId: targetUser.id,
      };

      await db.insert(poolUser).values(newParticipant);

      return newParticipant;
    }),
  removeParticipant: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        userId: z.string().trim().min(1, "Participante é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const currentPool = await requirePoolManager(input.poolId, context.session.user.id);

      if (currentPool.createdByUserId === input.userId) {
        throw new ORPCError("FORBIDDEN", {
          message: "Não é possível remover o criador do bolão",
        });
      }

      const existingParticipant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, input.userId)),
        columns: { id: true },
      });

      if (!existingParticipant) {
        throw new ORPCError("NOT_FOUND", {
          message: "Participante não encontrado nesse bolão",
        });
      }

      await db.delete(prediction).where(and(eq(prediction.poolId, input.poolId), eq(prediction.userId, input.userId)));
      await db.delete(poolQuestionAnswer).where(and(eq(poolQuestionAnswer.poolId, input.poolId), eq(poolQuestionAnswer.userId, input.userId)));
      await db.delete(poolUser).where(eq(poolUser.id, existingParticipant.id));

      return { success: true };
    }),
  join: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const poolExists = await db.query.pool.findFirst({
        where: eq(pool.id, input.poolId),
        columns: { id: true },
      });

      if (!poolExists) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bolão não encontrado",
        });
      }

      const participant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, userId)),
        columns: { id: true },
      });

      if (participant) {
        throw new ORPCError("CONFLICT", {
          message: "Você já participa desse bolão",
        });
      }

      await db.insert(poolUser).values({
        id: crypto.randomUUID(),
        poolId: input.poolId,
        userId,
      });

      return { success: true };
    }),
};
