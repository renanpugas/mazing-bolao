import { db, match, pool, poolQuestion, poolQuestionAnswer, poolUser, prediction, tournament } from "@mazing-bolao/db";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("Pool scoring routes E2E", () => {
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

  async function createFixture() {
    const owner = await signInTestUser(ownerAgent, { name: "Owner" });
    const participant = await signInTestUser(participantAgent, { name: "Participant" });
    await signInTestUser(outsiderAgent, { name: "Outsider" });
    await signInTestUser(adminAgent, { name: "Admin", isAdmin: true });
    const poolId = crypto.randomUUID();
    const questionId = crypto.randomUUID();
    const ownerPoolUserId = crypto.randomUUID();
    const participantPoolUserId = crypto.randomUUID();

    await db.insert(pool).values({
      id: poolId,
      name: "Bolão Teste",
      createdByUserId: owner.id,
    });
    await db.insert(poolUser).values([
      { id: ownerPoolUserId, poolId, userId: owner.id },
      { id: participantPoolUserId, poolId, userId: participant.id },
    ]);
    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Quem será campeão?",
      points: 3,
      closesAt: new Date(Date.now() + 60_000),
    });

    return { poolId, questionId, owner, participant, ownerPoolUserId, participantPoolUserId };
  }

  it("should allow an admin outside the pool to view and update config and question scores", async () => {
    const { poolId, questionId } = await createFixture();

    const configResponse = await rpc(adminAgent, "poolScoring/getConfig", { poolId });
    expect(configResponse.status).toBe(200);
    expect(configResponse.body).toMatchObject({
      poolId,
      canManage: true,
    });

    const rules = configResponse.body.rules.map((rule: { stage: string; exactScorePoints: number; outcomePoints: number; brazilMultiplier: number }) => ({
      stage: rule.stage,
      exactScorePoints: rule.exactScorePoints + 1,
      outcomePoints: rule.outcomePoints,
      brazilMultiplier: rule.brazilMultiplier,
    }));
    const updateConfigResponse = await rpc(adminAgent, "poolScoring/updateConfig", {
      poolId,
      rules,
      oddBonusRules: [
        { oddThreshold: 4, bonusPercent: 80 },
        { oddThreshold: 2, bonusPercent: 50 },
      ],
    });
    expect(updateConfigResponse.status).toBe(200);
    expect(updateConfigResponse.body).toMatchObject({
      canManage: true,
    });
    expect(updateConfigResponse.body.rules[0].exactScorePoints).toBe(configResponse.body.rules[0].exactScorePoints + 1);
    expect(updateConfigResponse.body.oddBonusRules).toEqual([
      { oddThreshold: 2, bonusPercent: 50 },
      { oddThreshold: 4, bonusPercent: 80 },
    ]);

    const updatedConfigResponse = await rpc(adminAgent, "poolScoring/getConfig", { poolId });
    expect(updatedConfigResponse.status).toBe(200);
    expect(updatedConfigResponse.body.oddBonusRules).toEqual([
      { oddThreshold: 2, bonusPercent: 50 },
      { oddThreshold: 4, bonusPercent: 80 },
    ]);

    const scoresResponse = await rpc(adminAgent, "poolScoring/listQuestionScores", { poolId });
    expect(scoresResponse.status).toBe(200);
    expect(scoresResponse.body).toMatchObject({
      canManage: true,
    });
    expect(scoresResponse.body.questions[0]).toMatchObject({ id: questionId, points: 3 });

    const updateScoresResponse = await rpc(adminAgent, "poolScoring/updateQuestionScores", {
      poolId,
      questions: [{ id: questionId, points: 8 }],
    });
    expect(updateScoresResponse.status).toBe(200);
    expect(updateScoresResponse.body).toMatchObject({
      canManage: true,
    });
    expect(updateScoresResponse.body.questions[0]).toMatchObject({ id: questionId, points: 8 });
  });

  it("should keep non-admin users from managing scoring", async () => {
    const { poolId, questionId } = await createFixture();

    const configResponse = await rpc(participantAgent, "poolScoring/getConfig", { poolId });
    expect(configResponse.status).toBe(200);
    expect(configResponse.body.canManage).toBe(false);

    const ownerConfigResponse = await rpc(ownerAgent, "poolScoring/getConfig", { poolId });
    expect(ownerConfigResponse.status).toBe(200);
    expect(ownerConfigResponse.body.canManage).toBe(false);

    const questionScoresResponse = await rpc(ownerAgent, "poolScoring/listQuestionScores", { poolId });
    expect(questionScoresResponse.status).toBe(200);
    expect(questionScoresResponse.body.canManage).toBe(false);

    const updateConfigResponse = await rpc(ownerAgent, "poolScoring/updateConfig", {
      poolId,
      rules: configResponse.body.rules.map((rule: { stage: string; exactScorePoints: number; outcomePoints: number; brazilMultiplier: number }) => ({
        stage: rule.stage,
        exactScorePoints: rule.exactScorePoints,
        outcomePoints: rule.outcomePoints,
        brazilMultiplier: rule.brazilMultiplier,
      })),
    });
    expect(updateConfigResponse.status).toBe(403);

    const participantUpdateConfigResponse = await rpc(participantAgent, "poolScoring/updateConfig", {
      poolId,
      rules: configResponse.body.rules.map((rule: { stage: string; exactScorePoints: number; outcomePoints: number; brazilMultiplier: number }) => ({
        stage: rule.stage,
        exactScorePoints: rule.exactScorePoints,
        outcomePoints: rule.outcomePoints,
        brazilMultiplier: rule.brazilMultiplier,
      })),
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 50 }],
    });
    expect(participantUpdateConfigResponse.status).toBe(403);

    const updateScoresResponse = await rpc(ownerAgent, "poolScoring/updateQuestionScores", {
      poolId,
      questions: [{ id: questionId, points: 9 }],
    });
    expect(updateScoresResponse.status).toBe(403);

    const participantUpdateScoresResponse = await rpc(participantAgent, "poolScoring/updateQuestionScores", {
      poolId,
      questions: [{ id: questionId, points: 9 }],
    });
    expect(participantUpdateScoresResponse.status).toBe(403);

    const outsiderResponse = await rpc(outsiderAgent, "poolScoring/getConfig", { poolId });
    expect(outsiderResponse.status).toBe(403);
  });

  it("should reject invalid odd bonus rules", async () => {
    const { poolId } = await createFixture();
    const configResponse = await rpc(adminAgent, "poolScoring/getConfig", { poolId });
    const rules = configResponse.body.rules.map((rule: { stage: string; exactScorePoints: number; outcomePoints: number; brazilMultiplier: number }) => ({
      stage: rule.stage,
      exactScorePoints: rule.exactScorePoints,
      outcomePoints: rule.outcomePoints,
      brazilMultiplier: rule.brazilMultiplier,
    }));

    const duplicatedResponse = await rpc(adminAgent, "poolScoring/updateConfig", {
      poolId,
      rules,
      oddBonusRules: [
        { oddThreshold: 2, bonusPercent: 50 },
        { oddThreshold: 2, bonusPercent: 80 },
      ],
    });
    expect(duplicatedResponse.status).toBe(400);

    const invalidValuesResponse = await rpc(adminAgent, "poolScoring/updateConfig", {
      poolId,
      rules,
      oddBonusRules: [{ oddThreshold: 0, bonusPercent: -1 }],
    });
    expect(invalidValuesResponse.status).toBe(400);
  });

  it("should include odd bonus points in ranking and match comparison", async () => {
    const { poolId, owner, participant, ownerPoolUserId, participantPoolUserId } = await createFixture();
    const configResponse = await rpc(adminAgent, "poolScoring/getConfig", { poolId });
    const rules = configResponse.body.rules.map((rule: { stage: string; exactScorePoints: number; outcomePoints: number; brazilMultiplier: number }) => ({
      stage: rule.stage,
      exactScorePoints: rule.exactScorePoints,
      outcomePoints: rule.outcomePoints,
      brazilMultiplier: rule.brazilMultiplier,
    }));
    const tournamentId = crypto.randomUUID();
    const matchId = crypto.randomUUID();

    await db.insert(tournament).values({
      id: tournamentId,
      name: "World Cup 2026",
      slug: `world-cup-${crypto.randomUUID()}`,
    });
    await db.update(pool).set({ tournamentId }).where(eq(pool.id, poolId));
    await db.insert(match).values({
      id: matchId,
      tournamentId,
      homeTeam: "Brazil",
      awayTeam: "Argentina",
      startsAt: new Date(Date.now() - 60_000),
      stage: "group",
      homeScore: 2,
      awayScore: 0,
      oddsHomeTeam: 2.5,
      finished: true,
    });
    await db.insert(prediction).values([
      {
        id: crypto.randomUUID(),
        poolId,
        matchId,
        userId: owner.id,
        poolUserId: ownerPoolUserId,
        homeGoals: 2,
        awayGoals: 0,
      },
      {
        id: crypto.randomUUID(),
        poolId,
        matchId,
        userId: participant.id,
        poolUserId: participantPoolUserId,
        homeGoals: 0,
        awayGoals: 1,
      },
    ]);

    const updateConfigResponse = await rpc(adminAgent, "poolScoring/updateConfig", {
      poolId,
      rules,
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 50 }],
    });
    expect(updateConfigResponse.status).toBe(200);

    const rankingResponse = await rpc(participantAgent, "poolScoring/ranking", { poolId });
    expect(rankingResponse.status).toBe(200);
    expect(rankingResponse.body.find((entry: { userId: string }) => entry.userId === owner.id)).toMatchObject({
      points: 30,
      oddBonuses: 1,
      oddBonusPoints: 10,
    });
    expect(rankingResponse.body.find((entry: { userId: string }) => entry.userId === participant.id)).toMatchObject({
      points: 0,
      oddBonuses: 0,
      oddBonusPoints: 0,
    });

    const comparisonResponse = await rpc(participantAgent, "predictions/matchComparison", { poolId, matchId });
    expect(comparisonResponse.status).toBe(200);
    expect(comparisonResponse.body.participants.find((entry: { userId: string }) => entry.userId === owner.id)).toMatchObject({
      points: 30,
      oddBonusPoints: 10,
      oddBonusPercent: 50,
      oddUsed: 2.5,
      oddBonusApplied: true,
    });
  });

  it("should list participant predictions with match privacy and per-match scoring", async () => {
    const { poolId, owner, participant, ownerPoolUserId, participantPoolUserId } = await createFixture();
    const configResponse = await rpc(adminAgent, "poolScoring/getConfig", { poolId });
    const rules = configResponse.body.rules.map((rule: { stage: string; exactScorePoints: number; outcomePoints: number; brazilMultiplier: number }) => ({
      stage: rule.stage,
      exactScorePoints: rule.exactScorePoints,
      outcomePoints: rule.outcomePoints,
      brazilMultiplier: rule.brazilMultiplier,
    }));
    const tournamentId = crypto.randomUUID();
    const finishedMatchId = crypto.randomUUID();
    const pendingMatchId = crypto.randomUUID();

    await db.insert(tournament).values({
      id: tournamentId,
      name: "World Cup 2026",
      slug: `world-cup-${crypto.randomUUID()}`,
    });
    await db.update(pool).set({ tournamentId }).where(eq(pool.id, poolId));
    await db.insert(match).values([
      {
        id: finishedMatchId,
        tournamentId,
        homeTeam: "Brazil",
        awayTeam: "Argentina",
        startsAt: new Date(Date.now() - 60_000),
        stage: "group",
        homeScore: 2,
        awayScore: 0,
        oddsHomeTeam: 2.5,
        finished: true,
      },
      {
        id: pendingMatchId,
        tournamentId,
        homeTeam: "Canada",
        awayTeam: "Mexico",
        startsAt: new Date(Date.now() + 60_000),
        stage: "group",
        finished: false,
      },
    ]);
    await db.insert(prediction).values([
      {
        id: crypto.randomUUID(),
        poolId,
        matchId: finishedMatchId,
        userId: owner.id,
        poolUserId: ownerPoolUserId,
        homeGoals: 2,
        awayGoals: 0,
      },
      {
        id: crypto.randomUUID(),
        poolId,
        matchId: pendingMatchId,
        userId: owner.id,
        poolUserId: ownerPoolUserId,
        homeGoals: 1,
        awayGoals: 1,
      },
      {
        id: crypto.randomUUID(),
        poolId,
        matchId: pendingMatchId,
        userId: participant.id,
        poolUserId: participantPoolUserId,
        homeGoals: 3,
        awayGoals: 2,
      },
    ]);

    const updateConfigResponse = await rpc(adminAgent, "poolScoring/updateConfig", {
      poolId,
      rules,
      oddBonusRules: [{ oddThreshold: 2, bonusPercent: 50 }],
    });
    expect(updateConfigResponse.status).toBe(200);

    const ownResponse = await rpc(participantAgent, "poolScoring/participantPredictions", {
      poolId,
      participantUserId: participant.id,
    });
    expect(ownResponse.status).toBe(200);
    expect(ownResponse.body.participant).toMatchObject({
      userId: participant.id,
      name: "Participant",
      isCurrentUser: true,
    });
    expect(ownResponse.body.matches.find((entry: { matchId: string }) => entry.matchId === pendingMatchId)).toMatchObject({
      showPrediction: true,
      hasPrediction: true,
      homeGoals: 3,
      awayGoals: 2,
      points: 0,
      resultType: "none",
      oddBonusPoints: 0,
      oddBonusApplied: false,
    });

    const otherResponse = await rpc(participantAgent, "poolScoring/participantPredictions", {
      poolId,
      participantUserId: owner.id,
    });
    expect(otherResponse.status).toBe(200);
    expect(otherResponse.body.participant).toMatchObject({
      userId: owner.id,
      isCurrentUser: false,
    });
    expect(otherResponse.body.matches.find((entry: { matchId: string }) => entry.matchId === pendingMatchId)).toMatchObject({
      showPrediction: false,
      hasPrediction: false,
      homeGoals: null,
      awayGoals: null,
      points: 0,
      resultType: "none",
      oddBonusPoints: 0,
      oddBonusApplied: false,
    });
    expect(otherResponse.body.matches.find((entry: { matchId: string }) => entry.matchId === finishedMatchId)).toMatchObject({
      showPrediction: true,
      hasPrediction: true,
      homeGoals: 2,
      awayGoals: 0,
      homeScore: 2,
      awayScore: 0,
      points: 30,
      resultType: "exact",
      oddBonusPoints: 10,
      oddBonusApplied: true,
    });

    const rankingResponse = await rpc(participantAgent, "poolScoring/ranking", { poolId });
    expect(rankingResponse.status).toBe(200);
    expect(rankingResponse.body.find((entry: { userId: string }) => entry.userId === owner.id)).toMatchObject({
      points: 30,
      oddBonusPoints: 10,
    });

    const outsiderResponse = await rpc(outsiderAgent, "poolScoring/participantPredictions", {
      poolId,
      participantUserId: owner.id,
    });
    expect(outsiderResponse.status).toBe(403);

    const adminResponse = await rpc(adminAgent, "poolScoring/participantPredictions", {
      poolId,
      participantUserId: owner.id,
    });
    expect(adminResponse.status).toBe(200);
  });

  it("should hide question answers from other participants until the question closes", async () => {
    const { poolId, questionId, owner, participant, ownerPoolUserId, participantPoolUserId } = await createFixture();
    const tournamentId = crypto.randomUUID();

    await db.insert(tournament).values({
      id: tournamentId,
      name: "World Cup 2026",
      slug: `world-cup-${crypto.randomUUID()}`,
    });
    await db.update(pool).set({ tournamentId }).where(eq(pool.id, poolId));

    await db.insert(poolQuestionAnswer).values([
      {
        id: crypto.randomUUID(),
        questionId,
        poolId,
        userId: owner.id,
        poolUserId: ownerPoolUserId,
        answer: "Brasil",
      },
      {
        id: crypto.randomUUID(),
        questionId,
        poolId,
        userId: participant.id,
        poolUserId: participantPoolUserId,
        answer: "França",
      },
    ]);

    const ownResponse = await rpc(participantAgent, "poolScoring/participantPredictions", {
      poolId,
      participantUserId: participant.id,
    });
    expect(ownResponse.status).toBe(200);
    expect(ownResponse.body.questions[0]).toMatchObject({
      questionId,
      showAnswer: true,
      answer: "França",
    });

    const otherResponse = await rpc(participantAgent, "poolScoring/participantPredictions", {
      poolId,
      participantUserId: owner.id,
    });
    expect(otherResponse.status).toBe(200);
    expect(otherResponse.body.questions[0]).toMatchObject({
      questionId,
      showAnswer: false,
      answer: null,
      answerId: null,
    });

    await db.update(poolQuestion).set({ closesAt: new Date(Date.now() - 60_000) }).where(eq(poolQuestion.id, questionId));

    const afterDeadlineResponse = await rpc(participantAgent, "poolScoring/participantPredictions", {
      poolId,
      participantUserId: owner.id,
    });
    expect(afterDeadlineResponse.status).toBe(200);
    expect(afterDeadlineResponse.body.questions[0]).toMatchObject({
      questionId,
      showAnswer: true,
      answer: "Brasil",
    });
  });
});
