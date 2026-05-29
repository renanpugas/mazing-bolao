import { afterEach, describe, expect, it } from "vitest";

import { cleanupDatabase, httpGet } from "./helpers";

describe("Auth routes E2E", () => {
  afterEach(async () => {
    await cleanupDatabase();
  });

  it("GET /api/auth/get-session without session should return null session", async () => {
    const response = await httpGet("/api/auth/get-session");

    expect(response.status).toBe(200);
    expect(response.body).toBeNull();
  });
});
