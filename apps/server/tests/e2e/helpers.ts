import request from "supertest";
import { createHmac } from "node:crypto";
import {
  account,
  db,
  groupStanding,
  match,
  pool,
  poolMatchScoringRule,
  poolQuestion,
  poolQuestionAnswer,
  poolUser,
  prediction,
  session,
  stadium,
  team,
  tournament,
  user,
  verification,
} from "@mazing-bolao/db";

import { createApp } from "../../src/app";

const app = createApp();
const authSecret = process.env.BETTER_AUTH_SECRET ?? "test-secret-with-at-least-32-characters";

function signCookieValue(value: string) {
  const signature = createHmac("sha256", authSecret).update(value).digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

export function createAgent(): request.Agent {
  return request.agent(app);
}

export async function signInTestUser(agent: request.Agent, userOverrides: Partial<typeof user.$inferInsert> = {}) {
  const testUser = {
    id: crypto.randomUUID(),
    name: "Test User",
    email: `user-${crypto.randomUUID()}@example.com`,
    emailVerified: true,
    ...userOverrides,
  };
  const token = crypto.randomUUID();

  await db.insert(user).values(testUser);
  await db.insert(session).values({
    id: crypto.randomUUID(),
    token,
    userId: testUser.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  (agent as request.Agent & { jar: { setCookie: (cookie: string) => void } }).jar.setCookie(
    `better-auth.session_token=${signCookieValue(token)}`,
  );

  return testUser;
}

export async function cleanupDatabase() {
  await db.delete(poolQuestionAnswer);
  await db.delete(poolQuestion);
  await db.delete(poolMatchScoringRule);
  await db.delete(prediction);
  await db.delete(match);
  await db.delete(groupStanding);
  await db.delete(stadium);
  await db.delete(team);
  await db.delete(poolUser);
  await db.delete(pool);
  await db.delete(tournament);
  await db.delete(session);
  await db.delete(account);
  await db.delete(verification);
  await db.delete(user);
}

export async function rpc<TBody>(agent: request.Agent, path: string, body?: TBody): Promise<request.Response> {
  const payload = body === undefined ? {} : { json: body };
  const response = await agent.post(`/rpc/${path}`).send(payload);

  if (response.status < 400 && response.body && typeof response.body === "object" && "json" in response.body) {
    (response as request.Response & { body: unknown }).body = response.body.json;
  }

  return response;
}

export async function httpGet(path: string): Promise<request.Response> {
  return request(app).get(path);
}
