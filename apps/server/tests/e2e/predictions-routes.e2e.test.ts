import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc } from "./helpers";

describe("Predictions routes E2E", () => {
  let agent: request.SuperAgentTest;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

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
});
