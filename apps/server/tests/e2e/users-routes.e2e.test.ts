import { db } from "@mazing-bolao/db";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { cleanupDatabase, createAgent, rpc, signInTestUser } from "./helpers";

describe("Users routes E2E", () => {
  let agent: request.Agent;

  beforeEach(() => {
    agent = createAgent();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it("should require auth for users endpoints", async () => {
    const listResponse = await rpc(agent, "users/list");
    expect(listResponse.status).toBe(401);

    const makeAdminResponse = await rpc(agent, "users/makeAdmin", { userId: crypto.randomUUID() });
    expect(makeAdminResponse.status).toBe(401);

    const removeAdminResponse = await rpc(agent, "users/removeAdmin", { userId: crypto.randomUUID() });
    expect(removeAdminResponse.status).toBe(401);
  });

  it("should allow only admins to list users", async () => {
    await signInTestUser(createAgent(), { isAdmin: true });
    await signInTestUser(agent, { isAdmin: false });

    const forbiddenResponse = await rpc(agent, "users/list");
    expect(forbiddenResponse.status).toBe(403);

    const adminAgent = createAgent();
    const admin = await signInTestUser(adminAgent, { name: "Admin", isAdmin: true });
    const response = await rpc(adminAgent, "users/list");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: admin.id,
          name: "Admin",
          isAdmin: true,
        }),
      ]),
    );
  });

  it("should allow admins to grant and remove admin from other users", async () => {
    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { name: "Admin", isAdmin: true });
    const target = await signInTestUser(createAgent(), { name: "Target", isAdmin: false });

    const grantResponse = await rpc(adminAgent, "users/makeAdmin", { userId: target.id });
    expect(grantResponse.status).toBe(200);
    expect(grantResponse.body).toMatchObject({ id: target.id, isAdmin: true });

    const promotedUser = await db.query.user.findFirst({
      where: (table, { eq }) => eq(table.id, target.id),
      columns: { isAdmin: true },
    });
    expect(promotedUser?.isAdmin).toBe(true);

    const removeResponse = await rpc(adminAgent, "users/removeAdmin", { userId: target.id });
    expect(removeResponse.status).toBe(200);
    expect(removeResponse.body).toMatchObject({ id: target.id, isAdmin: false });

    const demotedUser = await db.query.user.findFirst({
      where: (table, { eq }) => eq(table.id, target.id),
      columns: { isAdmin: true },
    });
    expect(demotedUser?.isAdmin).toBe(false);
  });

  it("should not allow admins to remove their own admin status", async () => {
    const admin = await signInTestUser(agent, { isAdmin: true });

    const response = await rpc(agent, "users/removeAdmin", { userId: admin.id });

    expect(response.status).toBe(403);

    const currentUser = await db.query.user.findFirst({
      where: (table, { eq }) => eq(table.id, admin.id),
      columns: { isAdmin: true },
    });
    expect(currentUser?.isAdmin).toBe(true);
  });

  it("should promote the first authenticated user when no admin exists", async () => {
    const firstUser = await signInTestUser(agent, { isAdmin: false });

    const response = await rpc(agent, "session/get");

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ id: firstUser.id, isAdmin: true });

    const currentUser = await db.query.user.findFirst({
      where: (table, { eq }) => eq(table.id, firstUser.id),
      columns: { isAdmin: true },
    });
    expect(currentUser?.isAdmin).toBe(true);
  });
});
