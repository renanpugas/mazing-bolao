import { db, match, pool, poolMatchScoringRule, poolOddBonusRule, poolUser, prediction, user } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { calculateMatchPredictionScore, isBrazilMatch, mergePoolScoringRules, normalizeScoringStage, type PoolScoringStage } from "../services/scoring";

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

      const customRules = await db
        .select({
          stage: poolMatchScoringRule.stage,
          exactScorePoints: poolMatchScoringRule.exactScorePoints,
          outcomePoints: poolMatchScoringRule.outcomePoints,
          brazilMultiplier: poolMatchScoringRule.brazilMultiplier,
        })
        .from(poolMatchScoringRule)
        .where(eq(poolMatchScoringRule.poolId, input.poolId));
      const scoringRules = mergePoolScoringRules(customRules.map((rule) => ({ ...rule, stage: rule.stage as PoolScoringStage })));

      const rows = await db
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
            homeTeamExternalId: match.homeTeamExternalId,
            awayTeamExternalId: match.awayTeamExternalId,
            startsAt: match.startsAt,
            stage: match.stage,
            groupName: match.groupName,
            matchday: match.matchday,
            stadiumName: match.stadiumName,
            stadiumCity: match.stadiumCity,
            oddsHomeTeam: match.oddsHomeTeam,
            oddsAwayTeam: match.oddsAwayTeam,
            oddsDraw: match.oddsDraw,
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

      return rows.map((row) => {
        const brazilMatch = isBrazilMatch(row.match);
        const rule = scoringRules.find((item) => item.stage === normalizeScoringStage(row.match.stage)) ?? scoringRules[0];

        return {
          ...row,
          match: {
            ...row.match,
            scoring: rule
              ? {
                  exactScorePoints: brazilMatch ? rule.exactScorePoints * rule.brazilMultiplier : rule.exactScorePoints,
                  outcomePoints: brazilMatch ? rule.outcomePoints * rule.brazilMultiplier : rule.outcomePoints,
                  baseExactScorePoints: rule.exactScorePoints,
                  baseOutcomePoints: rule.outcomePoints,
                  brazilMultiplier: rule.brazilMultiplier,
                  isBrazilMatch: brazilMatch,
                }
              : null,
          },
        };
      });
    }),
  matchComparison: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        matchId: z.string().trim().min(1, "Partida é obrigatória"),
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

      const selectedMatch = await db.query.match.findFirst({
        where: and(eq(match.id, input.matchId), eq(match.tournamentId, currentPool.tournamentId)),
        columns: {
          id: true,
          homeTeam: true,
          awayTeam: true,
          homeTeamLabel: true,
          awayTeamLabel: true,
          homeTeamEmoji: true,
          awayTeamEmoji: true,
          homeTeamExternalId: true,
          awayTeamExternalId: true,
          startsAt: true,
          stage: true,
          groupName: true,
          matchday: true,
          homeScore: true,
          awayScore: true,
          oddsHomeTeam: true,
          oddsAwayTeam: true,
          oddsDraw: true,
          finished: true,
        },
      });

      if (!selectedMatch) {
        throw new ORPCError("NOT_FOUND", {
          message: "Partida não encontrada no torneio desse bolão",
        });
      }

      const customRules = await db
        .select({
          stage: poolMatchScoringRule.stage,
          exactScorePoints: poolMatchScoringRule.exactScorePoints,
          outcomePoints: poolMatchScoringRule.outcomePoints,
          brazilMultiplier: poolMatchScoringRule.brazilMultiplier,
        })
        .from(poolMatchScoringRule)
        .where(eq(poolMatchScoringRule.poolId, input.poolId));
      const scoringRules = mergePoolScoringRules(customRules.map((rule) => ({ ...rule, stage: rule.stage as PoolScoringStage })));
      const oddBonusRules = await db
        .select({
          oddThreshold: poolOddBonusRule.oddThreshold,
          bonusPercent: poolOddBonusRule.bonusPercent,
        })
        .from(poolOddBonusRule)
        .where(eq(poolOddBonusRule.poolId, input.poolId))
        .orderBy(asc(poolOddBonusRule.oddThreshold));
      const canCompare = selectedMatch.startsAt <= new Date();
      const brazilMatch = isBrazilMatch(selectedMatch);

      const participantRows = await db
        .select({
          userId: user.id,
          name: user.name,
          email: user.email,
          predictionId: prediction.id,
          homeGoals: prediction.homeGoals,
          awayGoals: prediction.awayGoals,
        })
        .from(poolUser)
        .innerJoin(user, eq(user.id, poolUser.userId))
        .leftJoin(
          prediction,
          and(eq(prediction.poolId, input.poolId), eq(prediction.matchId, input.matchId), eq(prediction.userId, user.id)),
        )
        .where(eq(poolUser.poolId, input.poolId))
        .orderBy(asc(user.name));

      const visibleRows = participantRows.map((row) => {
        const showPrediction = canCompare || row.userId === userId;
        const homeGoals = showPrediction ? row.homeGoals : null;
        const awayGoals = showPrediction ? row.awayGoals : null;
        const score = calculateMatchPredictionScore({
          predictionHomeGoals: homeGoals,
          predictionAwayGoals: awayGoals,
          matchHomeScore: selectedMatch.finished ? selectedMatch.homeScore : null,
          matchAwayScore: selectedMatch.finished ? selectedMatch.awayScore : null,
          stage: selectedMatch.stage,
          isBrazilMatch: brazilMatch,
          rules: scoringRules,
          oddBonusRules,
          oddsHomeTeam: selectedMatch.oddsHomeTeam,
          oddsAwayTeam: selectedMatch.oddsAwayTeam,
          oddsDraw: selectedMatch.oddsDraw,
        });

        return {
          userId: row.userId,
          name: row.name,
          email: row.email,
          isCurrentUser: row.userId === userId,
          predictionId: showPrediction ? row.predictionId : null,
          homeGoals,
          awayGoals,
          hasPrediction: homeGoals !== null && awayGoals !== null,
          points: score.points,
          resultType: score.type,
          oddBonusPoints: score.oddBonusPoints,
          oddBonusPercent: score.oddBonusPercent,
          oddUsed: score.oddUsed,
          oddBonusApplied: score.oddBonusApplied,
        };
      });

      const comparableRows = visibleRows.filter((row) => row.hasPrediction);
      const distribution = comparableRows.reduce(
        (acc, row) => {
          if (row.homeGoals! > row.awayGoals!) acc.homeWinCount += 1;
          else if (row.awayGoals! > row.homeGoals!) acc.awayWinCount += 1;
          else acc.drawCount += 1;

          const currentUserPrediction = visibleRows.find((item) => item.isCurrentUser);
          if (
            currentUserPrediction?.hasPrediction &&
            row.homeGoals === currentUserPrediction.homeGoals &&
            row.awayGoals === currentUserPrediction.awayGoals
          ) {
            acc.sameAsCurrentUserCount += 1;
          }

          if (row.resultType === "exact") acc.exactScoreCount += 1;
          if (row.resultType === "outcome") acc.outcomeCount += 1;
          return acc;
        },
        { homeWinCount: 0, drawCount: 0, awayWinCount: 0, sameAsCurrentUserCount: 0, exactScoreCount: 0, outcomeCount: 0 },
      );

      return {
        match: selectedMatch,
        canCompare,
        participants: visibleRows,
        distribution,
      };
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
