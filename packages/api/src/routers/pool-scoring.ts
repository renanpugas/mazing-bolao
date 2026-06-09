import { db, match, poolMatchScoringRule, poolOddBonusRule, poolQuestion, poolQuestionAnswer, poolUser, prediction, user } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { requirePoolManager, requirePoolParticipantOrAdmin } from "../permissions";
import {
  calculateMatchPredictionScore,
  DEFAULT_POOL_SCORING_RULES,
  isBrazilMatch,
  mergePoolScoringRules,
  type PoolScoringStage,
} from "../services/scoring";

const scoringStageSchema = z.enum(DEFAULT_POOL_SCORING_RULES.map((rule) => rule.stage) as [PoolScoringStage, ...PoolScoringStage[]]);

const scoringRuleInput = z.object({
  stage: scoringStageSchema,
  exactScorePoints: z.number().int().min(0, "Pontuação deve ser um inteiro maior ou igual a zero"),
  outcomePoints: z.number().int().min(0, "Pontuação deve ser um inteiro maior ou igual a zero"),
  brazilMultiplier: z.number().int().min(1, "Multiplicador deve ser um inteiro positivo"),
});

const questionScoreInput = z.object({
  id: z.string().trim().min(1, "Pergunta é obrigatória"),
  points: z.number().int().positive("Pontuação deve ser um inteiro positivo"),
});

const oddBonusRuleInput = z.object({
  oddThreshold: z.number().positive("Odd deve ser maior que zero"),
  bonusPercent: z.number().int().min(0, "Bônus deve ser um inteiro maior ou igual a zero"),
});

const oddBonusRulesInput = z.array(oddBonusRuleInput).superRefine((rules, ctx) => {
  const thresholds = new Set<number>();

  rules.forEach((rule, index) => {
    if (thresholds.has(rule.oddThreshold)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Não envie faixas de odd duplicadas",
        path: [index, "oddThreshold"],
      });
    }
    thresholds.add(rule.oddThreshold);
  });
});

async function getMergedRules(poolId: string) {
  const customRules = await db
    .select({
      stage: poolMatchScoringRule.stage,
      exactScorePoints: poolMatchScoringRule.exactScorePoints,
      outcomePoints: poolMatchScoringRule.outcomePoints,
      brazilMultiplier: poolMatchScoringRule.brazilMultiplier,
    })
    .from(poolMatchScoringRule)
    .where(eq(poolMatchScoringRule.poolId, poolId));

  return mergePoolScoringRules(customRules.map((rule) => ({ ...rule, stage: rule.stage as PoolScoringStage })));
}

async function getOddBonusRules(poolId: string) {
  return db
    .select({
      oddThreshold: poolOddBonusRule.oddThreshold,
      bonusPercent: poolOddBonusRule.bonusPercent,
    })
    .from(poolOddBonusRule)
    .where(eq(poolOddBonusRule.poolId, poolId))
    .orderBy(asc(poolOddBonusRule.oddThreshold));
}

function normalizeOddBonusRules(rules: Array<{ oddThreshold: number; bonusPercent: number }>) {
  return [...rules].sort((a, b) => a.oddThreshold - b.oddThreshold);
}

export const poolScoringRouter = {
  getConfig: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentPool = await requirePoolParticipantOrAdmin(input.poolId, userId);

      const rules = await getMergedRules(input.poolId);
      const oddBonusRules = await getOddBonusRules(input.poolId);
      return {
        poolId: input.poolId,
        canManage: currentPool.canManage,
        rules,
        oddBonusRules,
        defaults: DEFAULT_POOL_SCORING_RULES,
      };
    }),
  updateConfig: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        rules: z.array(scoringRuleInput).length(DEFAULT_POOL_SCORING_RULES.length),
        oddBonusRules: oddBonusRulesInput.default([]),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await requirePoolManager(input.poolId, userId);

      const stages = new Set(input.rules.map((rule) => rule.stage));
      if (stages.size !== DEFAULT_POOL_SCORING_RULES.length) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Informe uma regra para cada fase",
        });
      }

      for (const rule of input.rules) {
        await db
          .insert(poolMatchScoringRule)
          .values({
            id: crypto.randomUUID(),
            poolId: input.poolId,
            stage: rule.stage,
            exactScorePoints: rule.exactScorePoints,
            outcomePoints: rule.outcomePoints,
            brazilMultiplier: rule.brazilMultiplier,
          })
          .onConflictDoUpdate({
            target: [poolMatchScoringRule.poolId, poolMatchScoringRule.stage],
            set: {
              exactScorePoints: rule.exactScorePoints,
              outcomePoints: rule.outcomePoints,
              brazilMultiplier: rule.brazilMultiplier,
              updatedAt: new Date(),
            },
          });
      }

      const oddBonusRules = normalizeOddBonusRules(input.oddBonusRules);
      await db.delete(poolOddBonusRule).where(eq(poolOddBonusRule.poolId, input.poolId));

      if (oddBonusRules.length) {
        await db.insert(poolOddBonusRule).values(
          oddBonusRules.map((rule) => ({
            id: crypto.randomUUID(),
            poolId: input.poolId,
            oddThreshold: rule.oddThreshold,
            bonusPercent: rule.bonusPercent,
          })),
        );
      }

      return {
        poolId: input.poolId,
        canManage: true,
        rules: await getMergedRules(input.poolId),
        oddBonusRules: await getOddBonusRules(input.poolId),
        defaults: DEFAULT_POOL_SCORING_RULES,
      };
    }),
  listQuestionScores: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentPool = await requirePoolParticipantOrAdmin(input.poolId, userId);

      const questions = await db
        .select({
          id: poolQuestion.id,
          question: poolQuestion.question,
          points: poolQuestion.points,
          closesAt: poolQuestion.closesAt,
          createdAt: poolQuestion.createdAt,
        })
        .from(poolQuestion)
        .where(eq(poolQuestion.poolId, input.poolId))
        .orderBy(asc(poolQuestion.closesAt), asc(poolQuestion.createdAt));

      return {
        poolId: input.poolId,
        canManage: currentPool.canManage,
        questions,
      };
    }),
  updateQuestionScores: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        questions: z.array(questionScoreInput),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await requirePoolManager(input.poolId, userId);

      const questionIds = new Set(input.questions.map((question) => question.id));
      if (questionIds.size !== input.questions.length) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Não envie perguntas duplicadas",
        });
      }

      for (const question of input.questions) {
        const result = await db
          .update(poolQuestion)
          .set({ points: question.points, updatedAt: new Date() })
          .where(and(eq(poolQuestion.id, question.id), eq(poolQuestion.poolId, input.poolId)))
          .returning({ id: poolQuestion.id });

        if (!result[0]) {
          throw new ORPCError("NOT_FOUND", {
            message: "Pergunta não encontrada nesse bolão",
          });
        }
      }

      const questions = await db
        .select({
          id: poolQuestion.id,
          question: poolQuestion.question,
          points: poolQuestion.points,
          closesAt: poolQuestion.closesAt,
          createdAt: poolQuestion.createdAt,
        })
        .from(poolQuestion)
        .where(eq(poolQuestion.poolId, input.poolId))
        .orderBy(asc(poolQuestion.closesAt), asc(poolQuestion.createdAt));

      return {
        poolId: input.poolId,
        canManage: true,
        questions,
      };
    }),
  ranking: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentPool = await requirePoolParticipantOrAdmin(input.poolId, userId);

      if (!currentPool.tournamentId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bolão não possui torneio vinculado",
        });
      }

      const rules = await getMergedRules(input.poolId);
      const oddBonusRules = await getOddBonusRules(input.poolId);
      const participants = await db
        .select({
          poolUserId: poolUser.id,
          userId: user.id,
          name: user.name,
          email: user.email,
        })
        .from(poolUser)
        .innerJoin(user, eq(user.id, poolUser.userId))
        .where(eq(poolUser.poolId, input.poolId))
        .orderBy(asc(user.name));

      const rankingByUserId = new Map(
        participants.map((participant) => [
          participant.userId,
          {
            userId: participant.userId,
            poolUserId: participant.poolUserId,
            name: participant.name,
            email: participant.email,
            points: 0,
            exactScores: 0,
            correctOutcomes: 0,
            brazilBonuses: 0,
            oddBonuses: 0,
            oddBonusPoints: 0,
            scoredMatches: 0,
            correctQuestions: 0,
            questionPoints: 0,
          },
        ]),
      );

      const predictionRows = await db
        .select({
          userId: prediction.userId,
          homeGoals: prediction.homeGoals,
          awayGoals: prediction.awayGoals,
          match: {
            id: match.id,
            stage: match.stage,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeTeamLabel: match.homeTeamLabel,
            awayTeamLabel: match.awayTeamLabel,
            homeTeamExternalId: match.homeTeamExternalId,
            awayTeamExternalId: match.awayTeamExternalId,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            oddsHomeTeam: match.oddsHomeTeam,
            oddsAwayTeam: match.oddsAwayTeam,
            oddsDraw: match.oddsDraw,
            finished: match.finished,
          },
        })
        .from(prediction)
        .innerJoin(match, eq(match.id, prediction.matchId))
        .where(and(eq(prediction.poolId, input.poolId), eq(match.tournamentId, currentPool.tournamentId)));

      for (const row of predictionRows) {
        const entry = rankingByUserId.get(row.userId);
        if (!entry) continue;

        const score = calculateMatchPredictionScore({
          predictionHomeGoals: row.homeGoals,
          predictionAwayGoals: row.awayGoals,
          matchHomeScore: row.match.finished ? row.match.homeScore : null,
          matchAwayScore: row.match.finished ? row.match.awayScore : null,
          stage: row.match.stage,
          isBrazilMatch: isBrazilMatch(row.match),
          rules,
          oddBonusRules,
          oddsHomeTeam: row.match.oddsHomeTeam,
          oddsAwayTeam: row.match.oddsAwayTeam,
          oddsDraw: row.match.oddsDraw,
        });

        entry.points += score.points;
        if (score.type === "exact") entry.exactScores += 1;
        if (score.type === "outcome") entry.correctOutcomes += 1;
        if (score.multiplied) entry.brazilBonuses += 1;
        entry.oddBonusPoints += score.oddBonusPoints;
        if (score.oddBonusApplied) entry.oddBonuses += 1;
        if (score.points > 0) entry.scoredMatches += 1;
      }

      const correctQuestionRows = await db
        .select({
          userId: poolQuestionAnswer.userId,
          points: poolQuestion.points,
        })
        .from(poolQuestionAnswer)
        .innerJoin(poolQuestion, eq(poolQuestion.id, poolQuestionAnswer.questionId))
        .where(and(eq(poolQuestionAnswer.poolId, input.poolId), eq(poolQuestionAnswer.isCorrect, true)));

      for (const row of correctQuestionRows) {
        const entry = rankingByUserId.get(row.userId);
        if (!entry) continue;

        entry.points += row.points;
        entry.questionPoints += row.points;
        entry.correctQuestions += 1;
      }

      return [...rankingByUserId.values()].sort(
        (a, b) =>
          b.points - a.points ||
          b.exactScores - a.exactScores ||
          b.correctOutcomes - a.correctOutcomes ||
          a.name.localeCompare(b.name),
      );
    }),
  participantPredictions: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        participantUserId: z.string().trim().min(1, "Participante é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentPool = await requirePoolParticipantOrAdmin(input.poolId, userId);

      if (!currentPool.tournamentId) {
        throw new ORPCError("NOT_FOUND", {
          message: "Bolão não possui torneio vinculado",
        });
      }

      const participant = await db
        .select({
          userId: user.id,
          name: user.name,
          email: user.email,
        })
        .from(poolUser)
        .innerJoin(user, eq(user.id, poolUser.userId))
        .where(and(eq(poolUser.poolId, input.poolId), eq(poolUser.userId, input.participantUserId)))
        .limit(1);

      if (!participant[0]) {
        throw new ORPCError("NOT_FOUND", {
          message: "Participante não encontrado nesse bolão",
        });
      }

      const rules = await getMergedRules(input.poolId);
      const oddBonusRules = await getOddBonusRules(input.poolId);
      const rows = await db
        .select({
          predictionHomeGoals: prediction.homeGoals,
          predictionAwayGoals: prediction.awayGoals,
          match: {
            id: match.id,
            startsAt: match.startsAt,
            startsAtTimeZone: match.startsAtTimeZone,
            stage: match.stage,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeTeamLabel: match.homeTeamLabel,
            awayTeamLabel: match.awayTeamLabel,
            homeTeamExternalId: match.homeTeamExternalId,
            awayTeamExternalId: match.awayTeamExternalId,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            oddsHomeTeam: match.oddsHomeTeam,
            oddsAwayTeam: match.oddsAwayTeam,
            oddsDraw: match.oddsDraw,
            finished: match.finished,
          },
        })
        .from(match)
        .leftJoin(
          prediction,
          and(
            eq(prediction.matchId, match.id),
            eq(prediction.poolId, input.poolId),
            eq(prediction.userId, input.participantUserId),
          ),
        )
        .where(eq(match.tournamentId, currentPool.tournamentId))
        .orderBy(asc(match.startsAt), asc(match.id));

      return {
        poolId: input.poolId,
        participant: {
          ...participant[0],
          isCurrentUser: participant[0].userId === userId,
        },
        matches: rows.map((row) => {
          const showPrediction = row.match.finished === true || input.participantUserId === userId;
          const hasVisiblePrediction = showPrediction && row.predictionHomeGoals !== null && row.predictionAwayGoals !== null;
          const score = showPrediction
            ? calculateMatchPredictionScore({
                predictionHomeGoals: row.predictionHomeGoals,
                predictionAwayGoals: row.predictionAwayGoals,
                matchHomeScore: row.match.finished ? row.match.homeScore : null,
                matchAwayScore: row.match.finished ? row.match.awayScore : null,
                stage: row.match.stage,
                isBrazilMatch: isBrazilMatch(row.match),
                rules,
                oddBonusRules,
                oddsHomeTeam: row.match.oddsHomeTeam,
                oddsAwayTeam: row.match.oddsAwayTeam,
                oddsDraw: row.match.oddsDraw,
              })
            : null;

          return {
            matchId: row.match.id,
            startsAt: row.match.startsAt,
            startsAtTimeZone: row.match.startsAtTimeZone,
            stage: row.match.stage,
            homeTeam: row.match.homeTeam,
            awayTeam: row.match.awayTeam,
            homeTeamLabel: row.match.homeTeamLabel,
            awayTeamLabel: row.match.awayTeamLabel,
            homeScore: row.match.finished ? row.match.homeScore : null,
            awayScore: row.match.finished ? row.match.awayScore : null,
            finished: row.match.finished === true,
            showPrediction,
            hasPrediction: hasVisiblePrediction,
            homeGoals: showPrediction ? row.predictionHomeGoals : null,
            awayGoals: showPrediction ? row.predictionAwayGoals : null,
            points: showPrediction ? score?.points ?? 0 : 0,
            resultType: showPrediction ? score?.type ?? "none" : "none",
            oddBonusPoints: showPrediction ? score?.oddBonusPoints ?? 0 : 0,
            oddBonusApplied: showPrediction ? score?.oddBonusApplied ?? false : false,
          };
        }),
      };
    }),
};
