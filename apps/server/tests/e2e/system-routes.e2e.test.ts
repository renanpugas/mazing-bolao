import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import { cleanupDatabase, createAgent, httpGet, rpc, signUpAndLogin } from "./helpers";

describe("System routes E2E", () => {
  let agent: request.SuperAgentTest;

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
    expect(response.body.json).toBe("OK");
  });

  it("POST /rpc/privateData should return 401 without auth", async () => {
    const response = await rpc(agent, "privateData");

    expect(response.status).toBe(401);
  });

  it("POST /rpc/privateData should return private payload with auth", async () => {
    const signUpResponse = await signUpAndLogin(agent);
    expect(signUpResponse.status).toBe(200);

    const response = await rpc(agent, "privateData");

    expect(response.status).toBe(200);
    expect(response.body.json).toMatchObject({
      message: "This is private",
    });
    expect(response.body.json.user.email).toContain("@example.com");
  });
});
