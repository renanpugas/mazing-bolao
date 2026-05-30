import { afterEach, beforeEach, describe, expect, it } from "vitest";

import request from "supertest";
import { cleanupDatabase, createAgent, httpGet } from "./helpers";

describe("Auth routes E2E", () => {
  let agent: request.SuperAgentTest;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it("GET /api/auth/get-session without session should return null session", async () => {
    const response = await httpGet("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });

  it("POST /api/auth/sign-up/email should return 404 (disabled in Google-only auth)", async () => {
    const response = await agent.post("/api/auth/sign-up/email").send({
      name: "E2E Register User",
      email: `register-${crypto.randomUUID()}@example.com`,
      password: "TestPassword123!",
    });

    expect(response.status).toBe(404);
  });
});
