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

  it("POST /api/users/register should register a new user", async () => {
    const response = await agent.post("/api/users/register").send({
      name: "E2E Register User",
      email: `register-${crypto.randomUUID()}@example.com`,
      password: "TestPassword123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      emailVerified: false,
      name: "E2E Register User",
    });
    expect(response.body.user.email).toContain("@example.com");
  });
});
