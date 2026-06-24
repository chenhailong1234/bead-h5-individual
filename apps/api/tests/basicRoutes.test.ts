import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { store } from "../src/store";

describe("basic commercial routes", () => {
  beforeEach(() => {
    store.reset();
  });

  it("logs in a development user and returns customer info", async () => {
    const agent = request.agent(createApp());

    const login = await agent.post("/api/auth/dev-login");
    expect(login.status).toBe(200);

    const customer = await agent.get("/api/app/customer/getInfo");
    expect(customer.status).toBe(200);
    expect(customer.body).toMatchObject({ regularCount: 1, memberCount: 0 });
  });

  it("returns app config and vip packages", async () => {
    const app = createApp();

    const config = await request(app).get("/api/app/config/getConfig");
    const vip = await request(app).get("/api/app/vip/queryList");

    expect(config.status).toBe(200);
    expect(config.body).toHaveProperty("uploadData");
    expect(config.body).toHaveProperty("brandList");
    expect(config.body).toHaveProperty("styleList");
    expect(config.body).toHaveProperty("tolerance");
    expect(config.body).toHaveProperty("gridSize");
    expect(config.body).toHaveProperty("colorLimit");
    expect(vip.status).toBe(200);
    expect(vip.body.length).toBeGreaterThan(0);
  });
});
