import { db, pool, poolQuestion, poolUser } from "@mazing-bolao/db";
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

    await db.insert(pool).values({
      id: poolId,
      name: "Bolão Teste",
      createdByUserId: owner.id,
    });
    await db.insert(poolUser).values([
      { id: crypto.randomUUID(), poolId, userId: owner.id },
      { id: crypto.randomUUID(), poolId, userId: participant.id },
    ]);
    await db.insert(poolQuestion).values({
      id: questionId,
      poolId,
      createdByUserId: owner.id,
      question: "Quem será campeão?",
      points: 3,
      closesAt: new Date(Date.now() + 60_000),
    });

    return { poolId, questionId };
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
    const updateConfigResponse = await rpc(adminAgent, "poolScoring/updateConfig", { poolId, rules });
    expect(updateConfigResponse.status).toBe(200);
    expect(updateConfigResponse.body).toMatchObject({
      canManage: true,
    });
    expect(updateConfigResponse.body.rules[0].exactScorePoints).toBe(configResponse.body.rules[0].exactScorePoints + 1);

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
});
