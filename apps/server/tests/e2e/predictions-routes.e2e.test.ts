import { db, match, prediction } from "@mazing-bolao/db";
import { eq } from "drizzle-orm";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signUpAndLogin } from "./helpers";

describe("Predictions routes E2E", () => {
  let agent: request.SuperAgentTest;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it("should create, list and update predictions", async () => {
    const signUpResponse = await signUpAndLogin(agent);
    expect(signUpResponse.status).toBe(200);

    const createPoolResponse = await rpc(agent, "pools/create", { name: "Bolao Palpites" });
    expect(createPoolResponse.status).toBe(200);
    const poolId: string = createPoolResponse.body.json.id;

    const matchId = crypto.randomUUID();
    await db.insert(match).values({
      id: matchId,
      poolId,
      homeTeam: "Brasil",
      awayTeam: "Argentina",
      startsAt: new Date("2026-07-01T20:00:00.000Z"),
    });

    const createPredictionResponse = await rpc(agent, "predictions/create", {
      poolId,
      matchId,
      homeGoals: 2,
      awayGoals: 1,
    });
    expect(createPredictionResponse.status).toBe(200);
    expect(createPredictionResponse.body.json).toMatchObject({
      poolId,
      matchId,
      homeGoals: 2,
      awayGoals: 1,
    });

    const listPredictionResponse = await rpc(agent, "predictions/list", { poolId });
    expect(listPredictionResponse.status).toBe(200);
    expect(listPredictionResponse.body.json).toHaveLength(1);
    expect(listPredictionResponse.body.json[0]).toMatchObject({
      id: createPredictionResponse.body.json.id,
      poolId,
      matchId,
      homeGoals: 2,
      awayGoals: 1,
      match: {
        id: matchId,
        homeTeam: "Brasil",
        awayTeam: "Argentina",
      },
    });

    const updatePredictionResponse = await rpc(agent, "predictions/update", {
      id: createPredictionResponse.body.json.id,
      homeGoals: 3,
      awayGoals: 2,
    });
    expect(updatePredictionResponse.status).toBe(200);
    expect(updatePredictionResponse.body.json).toMatchObject({
      id: createPredictionResponse.body.json.id,
      poolId,
      matchId,
      homeGoals: 3,
      awayGoals: 2,
    });

    const storedPrediction = await db.query.prediction.findFirst({
      where: eq(prediction.id, createPredictionResponse.body.json.id),
      columns: { homeGoals: true, awayGoals: true },
    });

    expect(storedPrediction).toMatchObject({
      homeGoals: 3,
      awayGoals: 2,
    });
  });
});
