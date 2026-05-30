import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc } from "./helpers";

describe("Pools routes E2E", () => {
  let agent: request.SuperAgentTest;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it("should require auth for pools endpoints", async () => {
    const createResponse = await rpc(agent, "pools/create", { name: "Bolao Teste" });
    expect(createResponse.status).toBe(401);

    const listResponse = await rpc(agent, "pools/list");
    expect(listResponse.status).toBe(401);

    const updateResponse = await rpc(agent, "pools/update", {
      id: crypto.randomUUID(),
      name: "Bolao Atualizado",
    });
    expect(updateResponse.status).toBe(401);

    const joinResponse = await rpc(agent, "pools/join", {
      poolId: crypto.randomUUID(),
    });
    expect(joinResponse.status).toBe(401);
  });
});
