import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { cleanupDatabase, createAgent, httpGet, rpc } from "./helpers";

describe("System routes E2E", () => {
  let agent: request.Agent;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it("GET /api-reference should return docs endpoint", async () => {
    const response = await httpGet("/api-reference");

    expect(response.status).toBe(200);
  });

  it("POST /rpc/healthCheck should return OK", async () => {
    const response = await rpc(agent, "healthCheck");

    expect(response.status).toBe(200);
    expect(response.body).toBe("OK");
  });

  it("POST /rpc/privateData should return 401 without auth", async () => {
    const response = await rpc(agent, "privateData");

    expect(response.status).toBe(401);
  });
});
