import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { isWechatPayConfigured } from "../src/services/wechatPay";

describe("wechat integration hooks", () => {
  it("reports mock mode when wechat payment env is incomplete", () => {
    expect(isWechatPayConfigured({
      appId: "",
      mchId: "",
      mchSerialNo: "",
      privateKey: "",
      apiV3Key: "",
      notifyUrl: ""
    })).toBe(false);
  });

  it("reports configurable mode when all payment env values exist", () => {
    expect(isWechatPayConfigured({
      appId: "wx123",
      mchId: "mch",
      mchSerialNo: "serial",
      privateKey: "key",
      apiV3Key: "v3",
      notifyUrl: "https://example.com/notify"
    })).toBe(true);
  });

  it("returns 501 for oauth start when wechat is not configured", async () => {
    const res = await request(createApp()).get("/api/auth/wechat/start");
    expect(res.status).toBe(501);
    expect(res.body.code).toBe("WECHAT_NOT_CONFIGURED");
  });
});
