import { db, pool, poolQuestion, poolQuestionAnswer, poolUser } from "@mazing-bolao/db";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("Pool questions routes E2E", () => {
  let ownerAgent: request.Agent;
  let participantAgent: request.Agent;
  let outsiderAgent: request.Agent;
  let adminAgent: request.Agent;

  beforeEach(() => {
    ownerAgent = createAgent();
    participantAgent = createAgent();
    outsiderAgent = createAgent();
    adminAgent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  async function createPoolFixture() {
    const owner = await signInTestUser(ownerAgent, { name: "Owner" });
    const participant = await signInTestUser(participantAgent, { name: "Participant" });
    const outsider = await signInTestUser(outsiderAgent, { name: "Outsider" });
    const admin = await signInTestUser(adminAgent, { name: "Admin", isAdmin: true });
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

    return { owner, participant, outsider, admin, poolId };
  }

  it("should require auth for pool question endpoints", async () => {
    const createResponse = await rpc(createAgent(), "poolQuestions/create", {
      poolId: crypto.randomUUID(),
      question: "Quem será campeão?",
      points: 3,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(createResponse.status).toBe(401);

    const updateResponse = await rpc(createAgent(), "poolQuestions/update", {
      questionId: crypto.randomUUID(),
      question: "Pergunta editada",
      points: 3,
      closesAt: new Date().toISOString(),
    });
    expect(updateResponse.status).toBe(401);

    const listResponse = await rpc(createAgent(), "poolQuestions/list", { poolId: crypto.randomUUID() });
    expect(listResponse.status).toBe(401);

    const answerResponse = await rpc(createAgent(), "poolQuestions/answer", {
      questionId: crypto.randomUUID(),
      answer: "Brasil",
    });
    expect(answerResponse.status).toBe(401);

    const listAnswersResponse = await rpc(createAgent(), "poolQuestions/listAnswers", { questionId: crypto.randomUUID() });
    expect(listAnswersResponse.status).toBe(401);

    const comparisonResponse = await rpc(createAgent(), "poolQuestions/comparison", {
      poolId: crypto.randomUUID(),
      questionId: crypto.randomUUID(),
    });
    expect(comparisonResponse.status).toBe(401);

    const reviewResponse = await rpc(createAgent(), "poolQuestions/reviewAnswer", {
      answerId: crypto.randomUUID(),
      isCorrect: true,
    });
    expect(reviewResponse.status).toBe(401);
  });

  it("should allow only admins to create questions", async () => {
    const { poolId } = await createPoolFixture();

    const forbiddenResponse = await rpc(participantAgent, "poolQuestions/create", {
      poolId,
      question: "Artilheiro?",
      points: 5,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(forbiddenResponse.status).toBe(403);

    const ownerResponse = await rpc(ownerAgent, "poolQuestions/create", {
      poolId,
      question: "Artilheiro?",
      points: 5,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(ownerResponse.status).toBe(403);

    const response = await rpc(adminAgent, "poolQuestions/create", {
      poolId,
      question: "Artilheiro?",
      points: 5,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(response.status).toBe(200);
    expect(response.body.question).toBe("Artilheiro?");
    expect(response.body.points).toBe(5);
  });

  it("should allow admins to update question, points and closesAt", async () => {
    const { owner, poolId } = await createPoolFixture();
    const questionId = crypto.randomUUID();
    const closesAt = new Date(Date.now() + 120_000);
    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Pergunta original",
      points: 2,
      closesAt: new Date(Date.now() + 60_000),
    });

    const response = await rpc(adminAgent, "poolQuestions/update", {
      questionId,
      question: "Pergunta editada",
      points: 8,
      closesAt: closesAt.toISOString(),
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Pergunta editada",
      points: 8,
    });
    expect(new Date(response.body.closesAt).getTime()).toBe(closesAt.getTime());

    const updatedQuestion = await db.query.poolQuestion.findFirst({
      where: (table, { eq }) => eq(table.id, questionId),
    });
    expect(updatedQuestion?.question).toBe("Pergunta editada");
    expect(updatedQuestion?.points).toBe(8);
    expect(updatedQuestion?.closesAt.getTime()).toBe(closesAt.getTime());
  });

  it("should allow only admins to update questions", async () => {
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

    const participantResponse = await rpc(participantAgent, "poolQuestions/update", {
      questionId,
      question: "Participante tentou editar",
      points: 3,
      closesAt: new Date(Date.now() + 120_000).toISOString(),
    });
    expect(participantResponse.status).toBe(403);

    const ownerResponse = await rpc(ownerAgent, "poolQuestions/update", {
      questionId,
      question: "Dono tentou editar",
      points: 3,
      closesAt: new Date(Date.now() + 120_000).toISOString(),
    });
    expect(ownerResponse.status).toBe(403);
  });

  it("should return 404 when updating a missing question", async () => {
    await createPoolFixture();

    const response = await rpc(adminAgent, "poolQuestions/update", {
      questionId: crypto.randomUUID(),
      question: "Pergunta editada",
      points: 3,
      closesAt: new Date().toISOString(),
    });

    expect(response.status).toBe(404);
  });

  it("should validate update question text and points", async () => {
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

    const emptyQuestionResponse = await rpc(adminAgent, "poolQuestions/update", {
      questionId,
      question: "   ",
      points: 3,
      closesAt: new Date().toISOString(),
    });
    expect(emptyQuestionResponse.status).toBe(400);

    const invalidPointsResponse = await rpc(adminAgent, "poolQuestions/update", {
      questionId,
      question: "Pergunta válida",
      points: 0,
      closesAt: new Date().toISOString(),
    });
    expect(invalidPointsResponse.status).toBe(400);
  });

  it("should accept past closesAt on update and block new answers", async () => {
    const { owner, poolId } = await createPoolFixture();
    const questionId = crypto.randomUUID();
    const pastClosesAt = new Date(Date.now() - 60_000);
    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Ainda aberta",
      points: 2,
      closesAt: new Date(Date.now() + 60_000),
    });

    const updateResponse = await rpc(adminAgent, "poolQuestions/update", {
      questionId,
      question: "Fechada agora",
      points: 2,
      closesAt: pastClosesAt.toISOString(),
    });
    expect(updateResponse.status).toBe(200);

    const answerResponse = await rpc(participantAgent, "poolQuestions/answer", {
      questionId,
      answer: "Tarde demais",
    });
    expect(answerResponse.status).toBe(403);
  });

  it("should validate positive integer points and future closesAt", async () => {
    const { poolId } = await createPoolFixture();

    const invalidPointsResponse = await rpc(adminAgent, "poolQuestions/create", {
      poolId,
      question: "Pergunta",
      points: 0,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(invalidPointsResponse.status).toBe(400);

    const pastDeadlineResponse = await rpc(adminAgent, "poolQuestions/create", {
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

  it("should allow only admins to list and review answers", async () => {
    const { owner, participant, admin, poolId } = await createPoolFixture();
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
    expect(ownerListResponse.status).toBe(403);

    const adminListResponse = await rpc(adminAgent, "poolQuestions/listAnswers", { questionId });
    expect(adminListResponse.status).toBe(200);
    expect(adminListResponse.body).toHaveLength(1);
    expect(adminListResponse.body[0].answer).toBe("Japão");

    const participantReviewResponse = await rpc(participantAgent, "poolQuestions/reviewAnswer", {
      answerId,
      isCorrect: false,
    });
    expect(participantReviewResponse.status).toBe(403);

    const ownerReviewResponse = await rpc(ownerAgent, "poolQuestions/reviewAnswer", {
      answerId,
      isCorrect: true,
    });
    expect(ownerReviewResponse.status).toBe(403);

    const adminReviewResponse = await rpc(adminAgent, "poolQuestions/reviewAnswer", {
      answerId,
      isCorrect: true,
    });
    expect(adminReviewResponse.status).toBe(200);
    expect(adminReviewResponse.body.isCorrect).toBe(true);
    expect(adminReviewResponse.body.reviewedByUserId).toBe(admin.id);
    expect(adminReviewResponse.body.reviewedAt).toBeTruthy();
  });

  it("should allow an admin outside the pool to create, list answers and review", async () => {
    const { participant, admin, poolId } = await createPoolFixture();
    const response = await rpc(adminAgent, "poolQuestions/create", {
      poolId,
      question: "Quem será campeão?",
      points: 4,
      closesAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(response.status).toBe(200);
    expect(response.body.createdByUserId).toBe(admin.id);

    const listResponse = await rpc(adminAgent, "poolQuestions/list", { poolId });
    expect(listResponse.status).toBe(200);
    expect(listResponse.body[0].question).toBe("Quem será campeão?");

    const participantPoolUser = await db.query.poolUser.findFirst({
      where: (table, { and, eq }) => and(eq(table.poolId, poolId), eq(table.userId, participant.id)),
    });
    const answerId = crypto.randomUUID();
    await db.insert(poolQuestionAnswer).values({
      id: answerId,
      questionId: response.body.id,
      poolId,
      userId: participant.id,
      poolUserId: participantPoolUser!.id,
      answer: "Brasil",
    });

    const answersResponse = await rpc(adminAgent, "poolQuestions/listAnswers", { questionId: response.body.id });
    expect(answersResponse.status).toBe(200);
    expect(answersResponse.body).toHaveLength(1);

    const reviewResponse = await rpc(adminAgent, "poolQuestions/reviewAnswer", {
      answerId,
      isCorrect: true,
    });
    expect(reviewResponse.status).toBe(200);
    expect(reviewResponse.body).toMatchObject({
      isCorrect: true,
      reviewedByUserId: admin.id,
    });
  });

  it("should hide other participants answers in question comparison until closesAt", async () => {
    const { owner, participant, poolId } = await createPoolFixture();
    const questionId = crypto.randomUUID();
    const ownerAnswerId = crypto.randomUUID();
    const participantAnswerId = crypto.randomUUID();
    const ownerPoolUser = await db.query.poolUser.findFirst({
      where: (table, { and, eq }) => and(eq(table.poolId, poolId), eq(table.userId, owner.id)),
    });
    const participantPoolUser = await db.query.poolUser.findFirst({
      where: (table, { and, eq }) => and(eq(table.poolId, poolId), eq(table.userId, participant.id)),
    });

    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Quem será campeão?",
      points: 4,
      closesAt: new Date(Date.now() + 60_000),
    });
    await db.insert(poolQuestionAnswer).values([
      {
        id: ownerAnswerId,
        questionId,
        poolId,
        userId: owner.id,
        poolUserId: ownerPoolUser!.id,
        answer: "Brasil",
      },
      {
        id: participantAnswerId,
        questionId,
        poolId,
        userId: participant.id,
        poolUserId: participantPoolUser!.id,
        answer: "França",
      },
    ]);

    const beforeDeadlineResponse = await rpc(participantAgent, "poolQuestions/comparison", { poolId, questionId });
    expect(beforeDeadlineResponse.status).toBe(200);
    expect(beforeDeadlineResponse.body.canCompare).toBe(false);
    expect(beforeDeadlineResponse.body.participants.find((entry: { userId: string }) => entry.userId === participant.id)).toMatchObject({
      showAnswer: true,
      answer: "França",
      hasAnswer: true,
    });
    expect(beforeDeadlineResponse.body.participants.find((entry: { userId: string }) => entry.userId === owner.id)).toMatchObject({
      showAnswer: false,
      answer: null,
      hasAnswer: false,
    });

    await db.update(poolQuestion).set({ closesAt: new Date(Date.now() - 60_000) }).where(eq(poolQuestion.id, questionId));

    const afterDeadlineResponse = await rpc(participantAgent, "poolQuestions/comparison", { poolId, questionId });
    expect(afterDeadlineResponse.status).toBe(200);
    expect(afterDeadlineResponse.body.canCompare).toBe(true);
    expect(afterDeadlineResponse.body.participants.find((entry: { userId: string }) => entry.userId === owner.id)).toMatchObject({
      showAnswer: true,
      answer: "Brasil",
      hasAnswer: true,
    });
  });
});
