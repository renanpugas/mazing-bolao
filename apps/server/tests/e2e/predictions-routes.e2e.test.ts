import request from "supertest";
import { db, match, pool, poolUser, prediction, tournament } from "@mazing-bolao/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("Predictions routes E2E", () => {
  let agent: request.Agent;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  async function createStartedMatchFixture() {
    const participant = await signInTestUser(agent);
    const tournamentId = crypto.randomUUID();
    const poolId = crypto.randomUUID();
    const poolUserId = crypto.randomUUID();
    const matchId = crypto.randomUUID();

    await db.insert(tournament).values({
      id: tournamentId,
      name: "World Cup 2026",
      slug: `world-cup-${crypto.randomUUID()}`,
    });
    await db.insert(pool).values({
      id: poolId,
      name: "Bolão da Copa",
      createdByUserId: participant.id,
      tournamentId,
    });
    await db.insert(poolUser).values({
      id: poolUserId,
      poolId,
      userId: participant.id,
    });
    await db.insert(match).values({
      id: matchId,
      tournamentId,
      homeTeam: "Brazil",
      awayTeam: "Morocco",
      startsAt: new Date(Date.now() - 60_000),
    });

    return { participant, poolId, poolUserId, matchId };
  }

  it("should require auth for predictions endpoints", async () => {
    const poolId = crypto.randomUUID();
    const matchId = crypto.randomUUID();
    const createPredictionResponse = await rpc(agent, "predictions/create", {
      poolId,
      matchId,
      homeGoals: 2,
      awayGoals: 1,
    });
    expect(createPredictionResponse.status).toBe(401);

    const listPredictionResponse = await rpc(agent, "predictions/list", { poolId });
    expect(listPredictionResponse.status).toBe(401);

    const updatePredictionResponse = await rpc(agent, "predictions/update", {
      id: crypto.randomUUID(),
      homeGoals: 3,
      awayGoals: 2,
    });
    expect(updatePredictionResponse.status).toBe(401);
  });

  it("should block creating predictions after the match has started", async () => {
    const { poolId, matchId } = await createStartedMatchFixture();

    const response = await rpc(agent, "predictions/create", {
      poolId,
      matchId,
      homeGoals: 2,
      awayGoals: 1,
    });

    expect(response.status).toBe(403);
    expect(response.body.json.message).toBe("Palpites encerrados para essa partida");

    const predictions = await db.query.prediction.findMany();
    expect(predictions).toHaveLength(0);
  });

  it("should block updating predictions after the match has started", async () => {
    const { participant, poolId, poolUserId, matchId } = await createStartedMatchFixture();
    const predictionId = crypto.randomUUID();

    await db.insert(prediction).values({
      id: predictionId,
      poolId,
      matchId,
      userId: participant.id,
      poolUserId,
      homeGoals: 1,
      awayGoals: 1,
    });

    const response = await rpc(agent, "predictions/update", {
      id: predictionId,
      homeGoals: 3,
      awayGoals: 2,
    });

    expect(response.status).toBe(403);
    expect(response.body.json.message).toBe("Palpites encerrados para essa partida");

    const currentPrediction = await db.query.prediction.findFirst({
      where: (table, { eq }) => eq(table.id, predictionId),
    });
    expect(currentPrediction?.homeGoals).toBe(1);
    expect(currentPrediction?.awayGoals).toBe(1);
  });
});
