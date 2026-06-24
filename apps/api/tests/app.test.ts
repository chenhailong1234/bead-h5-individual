import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

describe("app", () => {
  it("responds to health checks", async () => {
    const app = createApp();

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
