import { db, match, poolUser, prediction } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

export const predictionsRouter = {
  create: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        matchId: z.string().trim().min(1, "Partida é obrigatória"),
        homeGoals: z.number().int().min(0).nullable(),
        awayGoals: z.number().int().min(0).nullable(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const participant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, userId)),
        columns: { id: true },
      });

      if (!participant) {
        throw new ORPCError("FORBIDDEN", {
          message: "Você não participa desse bolão",
        });
      }

      const existingPrediction = await db.query.prediction.findFirst({
        where: and(
          eq(prediction.poolId, input.poolId),
          eq(prediction.matchId, input.matchId),
          eq(prediction.userId, userId),
        ),
        columns: { id: true },
      });

      if (existingPrediction) {
        throw new ORPCError("CONFLICT", {
          message: "Você já enviou um palpite para essa partida nesse bolão",
        });
      }

      const newPrediction = {
        id: crypto.randomUUID(),
        poolId: input.poolId,
        matchId: input.matchId,
        userId,
        poolUserId: participant.id,
        homeGoals: input.homeGoals,
        awayGoals: input.awayGoals,
      };

      await db.insert(prediction).values(newPrediction);

      return newPrediction;
    }),
  list: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      return db
        .select({
          id: prediction.id,
          poolId: prediction.poolId,
          matchId: prediction.matchId,
          poolUserId: prediction.poolUserId,
          homeGoals: prediction.homeGoals,
          awayGoals: prediction.awayGoals,
          createdAt: prediction.createdAt,
          updatedAt: prediction.updatedAt,
          match: {
            id: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            startsAt: match.startsAt,
          },
        })
        .from(prediction)
        .innerJoin(match, eq(match.id, prediction.matchId))
        .where(and(eq(prediction.poolId, input.poolId), eq(prediction.userId, userId)))
        .orderBy(asc(match.startsAt));
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().trim().min(1, "Palpite é obrigatório"),
        homeGoals: z.number().int().min(0).nullable(),
        awayGoals: z.number().int().min(0).nullable(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;

      const result = await db
        .update(prediction)
        .set({
          homeGoals: input.homeGoals,
          awayGoals: input.awayGoals,
          updatedAt: new Date(),
        })
        .where(and(eq(prediction.id, input.id), eq(prediction.userId, userId)))
        .returning({
          id: prediction.id,
          poolId: prediction.poolId,
          matchId: prediction.matchId,
          poolUserId: prediction.poolUserId,
          homeGoals: prediction.homeGoals,
          awayGoals: prediction.awayGoals,
          updatedAt: prediction.updatedAt,
        });

      const updatedPrediction = result[0];
      if (!updatedPrediction) {
        throw new ORPCError("NOT_FOUND", {
          message: "Palpite não encontrado",
        });
      }

      return updatedPrediction;
    }),
};
