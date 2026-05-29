import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app";

describe("Server E2E", () => {
  it("GET / should return OK", async () => {
    const app = createApp();

    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");
  });
});
