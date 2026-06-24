import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { store } from "../src/store";

describe("payment lifecycle", () => {
  beforeEach(() => {
    store.reset();
  });

  it("creates a mock payment and credits counts idempotently", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/dev-login");

    const created = await agent.post("/api/app/pay/create").send({ vipId: "normal-10" });
    expect(created.status).toBe(200);
    expect(created.body.payParams).toHaveProperty("package");

    const firstNotify = await agent.post("/api/app/pay/mock-notify").send({ outTradeNo: created.body.outTradeNo });
    const secondNotify = await agent.post("/api/app/pay/mock-notify").send({ outTradeNo: created.body.outTradeNo });
    const customer = await agent.get("/api/app/customer/getInfo");

    expect(firstNotify.status).toBe(200);
    expect(secondNotify.status).toBe(200);
    expect(customer.body.regularCount).toBe(11);
  });
});
