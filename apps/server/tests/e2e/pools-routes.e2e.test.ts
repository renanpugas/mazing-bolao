import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signUpAndLogin } from "./helpers";

describe("Pools routes E2E", () => {
  let agent: request.SuperAgentTest;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it("should create, list and update pools", async () => {
    const signUpResponse = await signUpAndLogin(agent);
    expect(signUpResponse.status).toBe(200);

    const createResponse = await rpc(agent, "pools/create", { name: "Bolao Teste" });
    expect(createResponse.status).toBe(200);
    expect(createResponse.body.json).toMatchObject({
      name: "Bolao Teste",
    });
    expect(createResponse.body.json.id).toBeTypeOf("string");

    const listResponse = await rpc(agent, "pools/list");
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.json)).toBe(true);
    expect(listResponse.body.json[0]).toMatchObject({
      id: createResponse.body.json.id,
      name: "Bolao Teste",
    });

    const updateResponse = await rpc(agent, "pools/update", {
      id: createResponse.body.json.id,
      name: "Bolao Atualizado",
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.json).toMatchObject({
      id: createResponse.body.json.id,
      name: "Bolao Atualizado",
    });
  });
});
