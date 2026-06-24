import { existsSync } from "node:fs";
import sharp from "sharp";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { store } from "../src/store";

async function sampleImage() {
  return sharp({
    create: {
      width: 6,
      height: 6,
      channels: 3,
      background: "#e33b3b"
    }
  }).png().toBuffer();
}

describe("bead routes", () => {
  beforeEach(() => {
    store.reset();
  });

  it("creates a task, deducts a count, and exposes history", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/dev-login");

    const upload = await agent
      .post("/api/app/bead/upload")
      .field("gridSize", "8")
      .field("colorLimit", "8")
      .field("brand", "MARD")
      .field("isAI", "false")
      .field("isReversal", "false")
      .field("tolerance", "0")
      .field("imageStyle", "卡通")
      .attach("file", await sampleImage(), "sample.png");

    expect(upload.status).toBe(200);
    expect(upload.body.msg).toBeTruthy();

    const task = await agent.get(`/api/app/bead/getBeadTask?logId=${upload.body.msg}`);
    const customer = await agent.get("/api/app/customer/getInfo");
    const history = await agent.get("/api/app/bead/queryBeadLogList");

    expect(task.status).toBe(200);
    expect(task.body.status).toBe("succeeded");
    expect(task.body.result).toContain("/uploads/");
    expect(customer.body.regularCount).toBe(0);
    expect(history.body).toHaveLength(1);
    expect(existsSync(task.body.absoluteResultPath)).toBe(true);
  });

  it("rejects generation when normal count is empty", async () => {
    const agent = request.agent(createApp());
    const login = await agent.post("/api/auth/dev-login");
    store.updateUserCounts(login.body.id, { regularCount: 0, memberCount: 0 });

    const upload = await agent
      .post("/api/app/bead/upload")
      .field("gridSize", "8")
      .field("colorLimit", "8")
      .field("brand", "MARD")
      .field("isAI", "false")
      .field("isReversal", "false")
      .field("tolerance", "0")
      .field("imageStyle", "卡通")
      .attach("file", await sampleImage(), "sample.png");

    expect(upload.status).toBe(402);
    expect(upload.body.code).toBe("NO_REGULAR_COUNT");
  });

  it("returns a clear error when the uploaded file is larger than the limit", async () => {
    const agent = request.agent(createApp());
    await agent.post("/api/auth/dev-login");

    const upload = await agent
      .post("/api/app/bead/upload")
      .field("gridSize", "8")
      .field("colorLimit", "8")
      .field("brand", "MARD")
      .field("isAI", "false")
      .field("isReversal", "false")
      .field("tolerance", "0")
      .field("imageStyle", "卡通")
      .attach("file", Buffer.alloc(10 * 1024 * 1024 + 1), "too-large.png");

    expect(upload.status).toBe(413);
    expect(upload.body.code).toBe("FILE_TOO_LARGE");
  });
});

