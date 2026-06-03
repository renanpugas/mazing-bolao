import { db, match, pool, poolUser, prediction } from "@mazing-bolao/db";
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
      const currentPool = await db.query.pool.findFirst({
        where: eq(pool.id, input.poolId),
        columns: { id: true, tournamentId: true },
      });

      if (!currentPool?.tournamentId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bolão não possui torneio vinculado",
        });
      }

      const participant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, userId)),
        columns: { id: true },
      });

      if (!participant) {
        throw new ORPCError("FORBIDDEN", {
          message: "Você não participa desse bolão",
        });
      }

      const matchToPredict = await db.query.match.findFirst({
        where: and(eq(match.id, input.matchId), eq(match.tournamentId, currentPool.tournamentId)),
        columns: { id: true, startsAt: true },
      });

      if (!matchToPredict) {
        throw new ORPCError("NOT_FOUND", {
          message: "Partida não encontrada no torneio desse bolão",
        });
      }

      if (matchToPredict.startsAt <= new Date()) {
        throw new ORPCError("FORBIDDEN", {
          message: "Palpites encerrados para essa partida",
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

      const currentPool = await db.query.pool.findFirst({
        where: eq(pool.id, input.poolId),
        columns: { id: true, tournamentId: true },
      });

      if (!currentPool?.tournamentId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bolão não possui torneio vinculado",
        });
      }

      const participant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, userId)),
        columns: { id: true },
      });

      if (!participant) {
        throw new ORPCError("FORBIDDEN", {
          message: "Você não participa desse bolão",
        });
      }

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
            homeTeamLabel: match.homeTeamLabel,
            awayTeamLabel: match.awayTeamLabel,
            homeTeamEmoji: match.homeTeamEmoji,
            awayTeamEmoji: match.awayTeamEmoji,
            startsAt: match.startsAt,
            stage: match.stage,
            groupName: match.groupName,
            matchday: match.matchday,
            stadiumName: match.stadiumName,
            stadiumCity: match.stadiumCity,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            finished: match.finished,
            timeElapsed: match.timeElapsed,
          },
        })
        .from(match)
        .leftJoin(
          prediction,
          and(eq(prediction.matchId, match.id), eq(prediction.poolId, input.poolId), eq(prediction.userId, userId)),
        )
        .where(eq(match.tournamentId, currentPool.tournamentId))
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

      const existingPrediction = await db
        .select({
          id: prediction.id,
          poolId: prediction.poolId,
          matchId: prediction.matchId,
          startsAt: match.startsAt,
        })
        .from(prediction)
        .innerJoin(match, eq(match.id, prediction.matchId))
        .where(and(eq(prediction.id, input.id), eq(prediction.userId, userId)))
        .limit(1);

      const currentPrediction = existingPrediction[0];
      if (!currentPrediction) {
        throw new ORPCError("NOT_FOUND", {
          message: "Palpite não encontrado",
        });
      }

      const participant = await db.query.poolUser.findFirst({
        where: and(eq(poolUser.poolId, currentPrediction.poolId), eq(poolUser.userId, userId)),
        columns: { id: true },
      });

      if (!participant) {
        throw new ORPCError("FORBIDDEN", {
          message: "Você não participa desse bolão",
        });
      }

      if (currentPrediction.startsAt <= new Date()) {
        throw new ORPCError("FORBIDDEN", {
          message: "Palpites encerrados para essa partida",
        });
      }

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
      return updatedPrediction;
    }),
};
