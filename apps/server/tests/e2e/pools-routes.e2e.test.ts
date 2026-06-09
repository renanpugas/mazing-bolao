import { db, pool, tournament } from "@mazing-bolao/db";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("Pools routes E2E", () => {
  let agent: request.Agent;

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

  it("should return isAdmin on session.get", async () => {
    const admin = await signInTestUser(agent, { isAdmin: true });

    const response = await rpc(agent, "session/get");

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: admin.id,
      isAdmin: true,
    });
  });

  it("should allow only admins to create pools", async () => {
    const tournamentId = crypto.randomUUID();
    await db.insert(tournament).values({
      id: tournamentId,
      name: "World Cup 2026",
      slug: `world-cup-${crypto.randomUUID()}`,
    });

    await signInTestUser(createAgent(), { isAdmin: true });
    await signInTestUser(agent, { isAdmin: false });
    const forbiddenResponse = await rpc(agent, "pools/create", {
      name: "Bolão comum",
      tournamentId,
    });
    expect(forbiddenResponse.status).toBe(403);

    const adminAgent = createAgent();
    const admin = await signInTestUser(adminAgent, { isAdmin: true });
    const response = await rpc(adminAgent, "pools/create", {
      name: "Bolão admin",
      tournamentId,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      name: "Bolão admin",
      createdByUserId: admin.id,
      tournamentId,
    });

    const creatorParticipant = await db.query.poolUser.findFirst({
      where: (table, { and, eq }) => and(eq(table.poolId, response.body.id), eq(table.userId, admin.id)),
    });
    expect(creatorParticipant).toBeTruthy();
  });

  it("should allow only admins to update pools", async () => {
    const ownerAgent = createAgent();
    const outsiderAgent = createAgent();
    const adminAgent = createAgent();
    const owner = await signInTestUser(ownerAgent, { name: "Owner" });
    await signInTestUser(outsiderAgent, { name: "Outsider" });
    await signInTestUser(adminAgent, { name: "Admin", isAdmin: true });
    const poolId = crypto.randomUUID();

    await db.insert(pool).values({
      id: poolId,
      name: "Bolão original",
      createdByUserId: owner.id,
    });

    const forbiddenResponse = await rpc(outsiderAgent, "pools/update", {
      id: poolId,
      name: "Tentativa comum",
    });
    expect(forbiddenResponse.status).toBe(403);

    const ownerResponse = await rpc(ownerAgent, "pools/update", {
      id: poolId,
      name: "Nome do dono",
    });
    expect(ownerResponse.status).toBe(403);

    const adminResponse = await rpc(adminAgent, "pools/update", {
      id: poolId,
      name: "Nome do admin",
    });
    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.name).toBe("Nome do admin");
  });
});
