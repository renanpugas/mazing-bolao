import request from "supertest";
import {
  account,
  db,
  groupStanding,
  match,
  pool,
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

export function createAgent(): request.Agent {
  return request.agent(app);
}

export async function cleanupDatabase() {
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
  return agent.post(`/rpc/${path}`).send(payload);
}

export async function httpGet(path: string): Promise<request.Response> {
  return request(app).get(path);
}
