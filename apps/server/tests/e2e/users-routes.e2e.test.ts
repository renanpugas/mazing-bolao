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

    const listAuthorizationsResponse = await rpc(agent, "users/listPasswordAuthorizations");
    expect(listAuthorizationsResponse.status).toBe(401);

    const createAuthorizationResponse = await rpc(agent, "users/createPasswordAuthorization", { email: "guest@example.com" });
    expect(createAuthorizationResponse.status).toBe(401);

    const revokeAuthorizationResponse = await rpc(agent, "users/revokePasswordAuthorization", { authorizationId: crypto.randomUUID() });
    expect(revokeAuthorizationResponse.status).toBe(401);

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

  it("should allow only admins to manage password login authorizations", async () => {
    await signInTestUser(createAgent(), { isAdmin: true });
    await signInTestUser(agent, { isAdmin: false });

    const listResponse = await rpc(agent, "users/listPasswordAuthorizations");
    expect(listResponse.status).toBe(403);

    const createResponse = await rpc(agent, "users/createPasswordAuthorization", { email: "guest@example.com" });
    expect(createResponse.status).toBe(403);

    const revokeResponse = await rpc(agent, "users/revokePasswordAuthorization", { authorizationId: crypto.randomUUID() });
    expect(revokeResponse.status).toBe(403);
  });

  it("should let admins create and revoke password login authorizations", async () => {
    const admin = await signInTestUser(agent, { isAdmin: true });

    const createResponse = await rpc(agent, "users/createPasswordAuthorization", { email: "Guest@Example.com" });
    expect(createResponse.status).toBe(200);
    expect(createResponse.body).toMatchObject({
      email: "guest@example.com",
      createdByUserId: admin.id,
      status: "pending",
    });

    const listResponse = await rpc(agent, "users/listPasswordAuthorizations");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.id,
          email: "guest@example.com",
          status: "pending",
        }),
      ]),
    );

    const revokeResponse = await rpc(agent, "users/revokePasswordAuthorization", { authorizationId: createResponse.body.id });
    expect(revokeResponse.status).toBe(200);
    expect(revokeResponse.body).toMatchObject({
      id: createResponse.body.id,
      email: "guest@example.com",
      revokedByUserId: admin.id,
      status: "revoked",
    });
  });

  it("should block password sign-up when the email is not authorized", async () => {
    const response = await agent.post("/api/auth/sign-up/email").send({
      name: "Unauthorized User",
      email: "unauthorized@example.com",
      password: "password1234",
    });

    expect(response.status).toBe(403);
  });

  it("should allow authorized users to sign up and sign in with email and password", async () => {
    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { isAdmin: true });

    const email = "authorized@example.com";
    const authorizationResponse = await rpc(adminAgent, "users/createPasswordAuthorization", { email });
    expect(authorizationResponse.status).toBe(200);

    const signupAgent = createAgent();
    const signUpResponse = await signupAgent.post("/api/auth/sign-up/email").send({
      name: "Authorized User",
      email,
      password: "password1234",
    });

    expect(signUpResponse.status).toBe(200);

    const createdUser = await db.query.user.findFirst({
      where: (table, { eq }) => eq(table.email, email),
      columns: { id: true, email: true },
    });
    expect(createdUser).toMatchObject({ email });

    const authorization = await db.query.passwordLoginAuthorization.findFirst({
      where: (table, { eq }) => eq(table.email, email),
      columns: { usedByUserId: true, usedAt: true, revokedAt: true },
    });
    expect(authorization?.usedByUserId).toBe(createdUser?.id);
    expect(authorization?.usedAt).toBeTruthy();
    expect(authorization?.revokedAt).toBeNull();

    const loginAgent = createAgent();
    const signInResponse = await loginAgent.post("/api/auth/sign-in/email").send({
      email,
      password: "password1234",
    });
    expect(signInResponse.status).toBe(200);

    const sessionResponse = await rpc(loginAgent, "session/get");
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.user).toMatchObject({ email });
  });

  it("should block password sign-up with a revoked authorization", async () => {
    const adminAgent = createAgent();
    await signInTestUser(adminAgent, { isAdmin: true });

    const email = "revoked@example.com";
    const authorizationResponse = await rpc(adminAgent, "users/createPasswordAuthorization", { email });
    expect(authorizationResponse.status).toBe(200);

    const revokeResponse = await rpc(adminAgent, "users/revokePasswordAuthorization", {
      authorizationId: authorizationResponse.body.id,
    });
    expect(revokeResponse.status).toBe(200);

    const signUpResponse = await agent.post("/api/auth/sign-up/email").send({
      name: "Revoked User",
      email,
      password: "password1234",
    });

    expect(signUpResponse.status).toBe(403);
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
