import { db, poolQuestion, poolQuestionAnswer, poolUser, user } from "@mazing-bolao/db";
import { ORPCError } from "@orpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { requirePoolManager, requirePoolParticipantOrAdmin } from "../permissions";

const answerInput = z.string().trim().min(1, "Resposta é obrigatória").max(4000);
const questionInput = z.string().trim().min(1, "Pergunta é obrigatória").max(1000);

async function requireParticipant(poolId: string, userId: string) {
  const participant = await db.query.poolUser.findFirst({
    where: and(eq(poolUser.poolId, poolId), eq(poolUser.userId, userId)),
    columns: { id: true },
  });

  if (!participant) {
    throw new ORPCError("FORBIDDEN", {
      message: "Você não participa desse bolão",
    });
  }

  return participant;
}

export const poolQuestionsRouter = {
  create: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
        question: questionInput,
        points: z.number().int().positive("Pontuação deve ser um inteiro positivo"),
        closesAt: z.coerce.date(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const closesAt = input.closesAt;

      await requirePoolManager(input.poolId, userId);

      if (closesAt <= new Date()) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Prazo deve estar no futuro",
        });
      }

      const newQuestion = {
        id: crypto.randomUUID(),
        poolId: input.poolId,
        createdByUserId: userId,
        question: input.question,
        points: input.points,
        closesAt,
      };

      await db.insert(poolQuestion).values(newQuestion);

      return newQuestion;
    }),
  update: protectedProcedure
    .input(
      z.object({
        questionId: z.string().trim().min(1, "Pergunta é obrigatória"),
        question: questionInput,
        points: z.number().int().positive("Pontuação deve ser um inteiro positivo"),
        closesAt: z.coerce.date(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentQuestion = await db.query.poolQuestion.findFirst({
        where: eq(poolQuestion.id, input.questionId),
        columns: { id: true, poolId: true },
      });

      if (!currentQuestion) {
        throw new ORPCError("NOT_FOUND", {
          message: "Pergunta não encontrada",
        });
      }

      await requirePoolManager(currentQuestion.poolId, userId);

      const result = await db
        .update(poolQuestion)
        .set({
          question: input.question,
          points: input.points,
          closesAt: input.closesAt,
          updatedAt: new Date(),
        })
        .where(eq(poolQuestion.id, input.questionId))
        .returning({
          id: poolQuestion.id,
          poolId: poolQuestion.poolId,
          createdByUserId: poolQuestion.createdByUserId,
          question: poolQuestion.question,
          points: poolQuestion.points,
          closesAt: poolQuestion.closesAt,
          createdAt: poolQuestion.createdAt,
          updatedAt: poolQuestion.updatedAt,
        });

      return result[0];
    }),
  list: protectedProcedure
    .input(
      z.object({
        poolId: z.string().trim().min(1, "Bolão é obrigatório"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      await requirePoolParticipantOrAdmin(input.poolId, userId);

      return db
        .select({
          id: poolQuestion.id,
          poolId: poolQuestion.poolId,
          createdByUserId: poolQuestion.createdByUserId,
          question: poolQuestion.question,
          points: poolQuestion.points,
          closesAt: poolQuestion.closesAt,
          createdAt: poolQuestion.createdAt,
          updatedAt: poolQuestion.updatedAt,
          answer: {
            id: poolQuestionAnswer.id,
            answer: poolQuestionAnswer.answer,
            isCorrect: poolQuestionAnswer.isCorrect,
            reviewedByUserId: poolQuestionAnswer.reviewedByUserId,
            reviewedAt: poolQuestionAnswer.reviewedAt,
            createdAt: poolQuestionAnswer.createdAt,
            updatedAt: poolQuestionAnswer.updatedAt,
          },
        })
        .from(poolQuestion)
        .leftJoin(
          poolQuestionAnswer,
          and(eq(poolQuestionAnswer.questionId, poolQuestion.id), eq(poolQuestionAnswer.userId, userId)),
        )
        .where(eq(poolQuestion.poolId, input.poolId))
        .orderBy(asc(poolQuestion.closesAt), asc(poolQuestion.createdAt));
    }),
  answer: protectedProcedure
    .input(
      z.object({
        questionId: z.string().trim().min(1, "Pergunta é obrigatória"),
        answer: answerInput,
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentQuestion = await db.query.poolQuestion.findFirst({
        where: eq(poolQuestion.id, input.questionId),
        columns: { id: true, poolId: true, closesAt: true },
      });

      if (!currentQuestion) {
        throw new ORPCError("NOT_FOUND", {
          message: "Pergunta não encontrada",
        });
      }

      const participant = await requireParticipant(currentQuestion.poolId, userId);

      if (currentQuestion.closesAt <= new Date()) {
        throw new ORPCError("FORBIDDEN", {
          message: "Respostas encerradas para essa pergunta",
        });
      }

      const existingAnswer = await db.query.poolQuestionAnswer.findFirst({
        where: and(eq(poolQuestionAnswer.questionId, input.questionId), eq(poolQuestionAnswer.userId, userId)),
        columns: { id: true, isCorrect: true },
      });

      if (existingAnswer?.isCorrect !== null && existingAnswer?.isCorrect !== undefined) {
        throw new ORPCError("FORBIDDEN", {
          message: "Resposta já corrigida não pode ser editada",
        });
      }

      if (existingAnswer) {
        const result = await db
          .update(poolQuestionAnswer)
          .set({ answer: input.answer, updatedAt: new Date() })
          .where(eq(poolQuestionAnswer.id, existingAnswer.id))
          .returning({
            id: poolQuestionAnswer.id,
            questionId: poolQuestionAnswer.questionId,
            poolId: poolQuestionAnswer.poolId,
            userId: poolQuestionAnswer.userId,
            poolUserId: poolQuestionAnswer.poolUserId,
            answer: poolQuestionAnswer.answer,
            isCorrect: poolQuestionAnswer.isCorrect,
            reviewedByUserId: poolQuestionAnswer.reviewedByUserId,
            reviewedAt: poolQuestionAnswer.reviewedAt,
            updatedAt: poolQuestionAnswer.updatedAt,
          });

        return result[0];
      }

      const newAnswer = {
        id: crypto.randomUUID(),
        questionId: currentQuestion.id,
        poolId: currentQuestion.poolId,
        userId,
        poolUserId: participant.id,
        answer: input.answer,
      };

      await db.insert(poolQuestionAnswer).values(newAnswer);

      return newAnswer;
    }),
  listAnswers: protectedProcedure
    .input(
      z.object({
        questionId: z.string().trim().min(1, "Pergunta é obrigatória"),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentQuestion = await db.query.poolQuestion.findFirst({
        where: eq(poolQuestion.id, input.questionId),
        columns: { id: true, poolId: true },
      });

      if (!currentQuestion) {
        throw new ORPCError("NOT_FOUND", {
          message: "Pergunta não encontrada",
        });
      }

      await requirePoolManager(currentQuestion.poolId, userId);

      return db
        .select({
          id: poolQuestionAnswer.id,
          questionId: poolQuestionAnswer.questionId,
          poolId: poolQuestionAnswer.poolId,
          userId: poolQuestionAnswer.userId,
          poolUserId: poolQuestionAnswer.poolUserId,
          answer: poolQuestionAnswer.answer,
          isCorrect: poolQuestionAnswer.isCorrect,
          reviewedByUserId: poolQuestionAnswer.reviewedByUserId,
          reviewedAt: poolQuestionAnswer.reviewedAt,
          createdAt: poolQuestionAnswer.createdAt,
          updatedAt: poolQuestionAnswer.updatedAt,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        })
        .from(poolQuestionAnswer)
        .innerJoin(user, eq(user.id, poolQuestionAnswer.userId))
        .where(eq(poolQuestionAnswer.questionId, input.questionId))
        .orderBy(asc(poolQuestionAnswer.createdAt));
    }),
  reviewAnswer: protectedProcedure
    .input(
      z.object({
        answerId: z.string().trim().min(1, "Resposta é obrigatória"),
        isCorrect: z.boolean(),
      }),
    )
    .handler(async ({ context, input }) => {
      const userId = context.session.user.id;
      const currentAnswer = await db.query.poolQuestionAnswer.findFirst({
        where: eq(poolQuestionAnswer.id, input.answerId),
        columns: { id: true, poolId: true },
      });

      if (!currentAnswer) {
        throw new ORPCError("NOT_FOUND", {
          message: "Resposta não encontrada",
        });
      }

      await requirePoolManager(currentAnswer.poolId, userId);

      const result = await db
        .update(poolQuestionAnswer)
        .set({
          isCorrect: input.isCorrect,
          reviewedByUserId: userId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(poolQuestionAnswer.id, input.answerId))
        .returning({
          id: poolQuestionAnswer.id,
          isCorrect: poolQuestionAnswer.isCorrect,
          reviewedByUserId: poolQuestionAnswer.reviewedByUserId,
          reviewedAt: poolQuestionAnswer.reviewedAt,
          updatedAt: poolQuestionAnswer.updatedAt,
        });

      return result[0];
    }),
};
