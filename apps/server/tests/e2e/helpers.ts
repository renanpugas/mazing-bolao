import request from "supertest";
import { account, db, match, pool, prediction, session, user, verification } from "@mazing-bolao/db";

import { createApp } from "../../src/app";

const app = createApp();

export function createAgent() {
  return request.agent(app);
}

export async function cleanupDatabase() {
  await db.delete(prediction);
  await db.delete(match);
  await db.delete(pool);
  await db.delete(session);
  await db.delete(account);
  await db.delete(verification);
  await db.delete(user);
}

export async function signUpAndLogin(agent: request.SuperAgentTest) {
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  const password = "TestPassword123!";

  const signUpResponse = await agent.post("/api/auth/sign-up/email").send({
    name: "E2E User",
    email,
    password,
  });

  return signUpResponse;
}

export async function rpc<TBody>(agent: request.SuperAgentTest, path: string, body?: TBody) {
  const payload = body === undefined ? {} : { json: body };
  return agent.post(`/rpc/${path}`).send(payload);
}

export async function httpGet(path: string) {
  return request(app).get(path);
}
