import { db, pool, poolQuestion, poolQuestionAnswer, poolUser } from "@mazing-bolao/db";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("Pool questions routes E2E", () => {
  let ownerAgent: request.Agent;
  let participantAgent: request.Agent;
  let outsiderAgent: request.Agent;

  beforeEach(() => {
    ownerAgent = createAgent();
    participantAgent = createAgent();
    outsiderAgent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  async function createPoolFixture() {
    const owner = await signInTestUser(ownerAgent, { name: "Owner" });
    const participant = await signInTestUser(participantAgent, { name: "Participant" });
    const outsider = await signInTestUser(outsiderAgent, { name: "Outsider" });
    const poolId = crypto.randomUUID();

    await db.insert(pool).values({
      id: poolId,
      name: "Bolão Teste",
      createdByUserId: owner.id,
    });
    await db.insert(poolUser).values([
      { id: crypto.randomUUID(), poolId, userId: owner.id },
      { id: crypto.randomUUID(), poolId, userId: participant.id },
    ]);

    return { owner, participant, outsider, poolId };
  }

  it("should require auth for pool question endpoints", async () => {
    const createResponse = await rpc(createAgent(), "poolQuestions/create", {
      poolId: crypto.randomUUID(),
      question: "Quem será campeão?",
      points: 3,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(createResponse.status).toBe(401);

    const listResponse = await rpc(createAgent(), "poolQuestions/list", { poolId: crypto.randomUUID() });
    expect(listResponse.status).toBe(401);

    const answerResponse = await rpc(createAgent(), "poolQuestions/answer", {
      questionId: crypto.randomUUID(),
      answer: "Brasil",
    });
    expect(answerResponse.status).toBe(401);

    const listAnswersResponse = await rpc(createAgent(), "poolQuestions/listAnswers", { questionId: crypto.randomUUID() });
    expect(listAnswersResponse.status).toBe(401);

    const reviewResponse = await rpc(createAgent(), "poolQuestions/reviewAnswer", {
      answerId: crypto.randomUUID(),
      isCorrect: true,
    });
    expect(reviewResponse.status).toBe(401);
  });

  it("should allow only the pool creator to create questions", async () => {
    const { poolId } = await createPoolFixture();

    const forbiddenResponse = await rpc(participantAgent, "poolQuestions/create", {
      poolId,
      question: "Artilheiro?",
      points: 5,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(forbiddenResponse.status).toBe(403);

    const response = await rpc(ownerAgent, "poolQuestions/create", {
      poolId,
      question: "Artilheiro?",
      points: 5,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(response.status).toBe(200);
    expect(response.body.question).toBe("Artilheiro?");
    expect(response.body.points).toBe(5);
  });

  it("should validate positive integer points and future closesAt", async () => {
    const { poolId } = await createPoolFixture();

    const invalidPointsResponse = await rpc(ownerAgent, "poolQuestions/create", {
      poolId,
      question: "Pergunta",
      points: 0,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(invalidPointsResponse.status).toBe(400);

    const pastDeadlineResponse = await rpc(ownerAgent, "poolQuestions/create", {
      poolId,
      question: "Pergunta",
      points: 1,
      closesAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(pastDeadlineResponse.status).toBe(400);
  });

  it("should let a pool participant answer free text before the deadline", async () => {
    const { poolId } = await createPoolFixture();
    const questionId = crypto.randomUUID();
    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: (await db.query.pool.findFirst({ where: (table, { eq }) => eq(table.id, poolId) }))!.createdByUserId!,
      question: "Qual será a surpresa?",
      points: 2,
      closesAt: new Date(Date.now() + 60_000),
    });

    const response = await rpc(participantAgent, "poolQuestions/answer", {
      questionId,
      answer: "Uma resposta livre, com vírgulas e qualquer texto.",
    });

    expect(response.status).toBe(200);
    expect(response.body.answer).toBe("Uma resposta livre, com vírgulas e qualquer texto.");

    const listResponse = await rpc(participantAgent, "poolQuestions/list", { poolId });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body[0].answer.answer).toBe("Uma resposta livre, com vírgulas e qualquer texto.");
  });

  it("should block outsiders from listing questions, answering and listing answers", async () => {
    const { owner, poolId } = await createPoolFixture();
    const questionId = crypto.randomUUID();
    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Pergunta",
      points: 1,
      closesAt: new Date(Date.now() + 60_000),
    });

    const listResponse = await rpc(outsiderAgent, "poolQuestions/list", { poolId });
    expect(listResponse.status).toBe(403);

    const answerResponse = await rpc(outsiderAgent, "poolQuestions/answer", { questionId, answer: "Texto" });
    expect(answerResponse.status).toBe(403);

    const listAnswersResponse = await rpc(outsiderAgent, "poolQuestions/listAnswers", { questionId });
    expect(listAnswersResponse.status).toBe(403);
  });

  it("should block answers after closesAt and after review", async () => {
    const { owner, participant, poolId } = await createPoolFixture();
    const closedQuestionId = crypto.randomUUID();
    const reviewedQuestionId = crypto.randomUUID();
    const answerId = crypto.randomUUID();

    const participantPoolUser = await db.query.poolUser.findFirst({
      where: (table, { and, eq }) => and(eq(table.poolId, poolId), eq(table.userId, participant.id)),
    });

    await db.insert(poolQuestion).values([
      {
        id: closedQuestionId,
        poolId,
        createdByUserId: owner.id,
        question: "Fechada",
        points: 1,
        closesAt: new Date(Date.now() - 60_000),
      },
      {
        id: reviewedQuestionId,
        poolId,
        createdByUserId: owner.id,
        question: "Corrigida",
        points: 1,
        closesAt: new Date(Date.now() + 60_000),
      },
    ]);
    await db.insert(poolQuestionAnswer).values({
      id: answerId,
      questionId: reviewedQuestionId,
      poolId,
      userId: participant.id,
      poolUserId: participantPoolUser!.id,
      answer: "Original",
      isCorrect: true,
      reviewedByUserId: owner.id,
      reviewedAt: new Date(),
    });

    const closedResponse = await rpc(participantAgent, "poolQuestions/answer", {
      questionId: closedQuestionId,
      answer: "Tarde",
    });
    expect(closedResponse.status).toBe(403);

    const reviewedResponse = await rpc(participantAgent, "poolQuestions/answer", {
      questionId: reviewedQuestionId,
      answer: "Editada",
    });
    expect(reviewedResponse.status).toBe(403);
  });

  it("should allow only the owner to list and review answers", async () => {
    const { owner, participant, poolId } = await createPoolFixture();
    const questionId = crypto.randomUUID();
    const answerId = crypto.randomUUID();
    const participantPoolUser = await db.query.poolUser.findFirst({
      where: (table, { and, eq }) => and(eq(table.poolId, poolId), eq(table.userId, participant.id)),
    });

    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Quem passa?",
      points: 3,
      closesAt: new Date(Date.now() + 60_000),
    });
    await db.insert(poolQuestionAnswer).values({
      id: answerId,
      questionId,
      poolId,
      userId: participant.id,
      poolUserId: participantPoolUser!.id,
      answer: "Japão",
    });

    const participantListResponse = await rpc(participantAgent, "poolQuestions/listAnswers", { questionId });
    expect(participantListResponse.status).toBe(403);

    const ownerListResponse = await rpc(ownerAgent, "poolQuestions/listAnswers", { questionId });
    expect(ownerListResponse.status).toBe(200);
    expect(ownerListResponse.body).toHaveLength(1);
    expect(ownerListResponse.body[0].answer).toBe("Japão");

    const participantReviewResponse = await rpc(participantAgent, "poolQuestions/reviewAnswer", {
      answerId,
      isCorrect: false,
    });
    expect(participantReviewResponse.status).toBe(403);

    const ownerReviewResponse = await rpc(ownerAgent, "poolQuestions/reviewAnswer", {
      answerId,
      isCorrect: true,
    });
    expect(ownerReviewResponse.status).toBe(200);
    expect(ownerReviewResponse.body.isCorrect).toBe(true);
    expect(ownerReviewResponse.body.reviewedByUserId).toBe(owner.id);
    expect(ownerReviewResponse.body.reviewedAt).toBeTruthy();
  });
});
