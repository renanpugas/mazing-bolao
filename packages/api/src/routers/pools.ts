import { db, pool, poolUser, tournament } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

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
    .handler(async ({ input }) => {
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
