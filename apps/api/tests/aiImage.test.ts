import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { buildVolcengineImageRequest, imageFileToDataUrl, promptForAiStyle, volcengineAiImageProvider } from "../src/services/aiImage";

describe("AI image service", () => {
  it("builds Volcengine image requests without exposing secrets", () => {
    const previousModel = env.ai.volcengineImageModel;
    const previousKey = env.ai.volcengineApiKey;
    env.ai.volcengineImageModel = "doubao-seedream-4-0-250828";
    env.ai.volcengineApiKey = "fake-secret-key";

    const request = buildVolcengineImageRequest("data:image/png;base64,abc", "remove-background-cartoonize");

    expect(request.model).toBe("doubao-seedream-4-0-250828");
    expect(request.image).toBe("data:image/png;base64,abc");
    expect(request.size).toBe("1024x1024");
    expect(request.prompt).toContain("cartoon");
    expect(JSON.stringify(request)).not.toContain(env.ai.volcengineApiKey);

    env.ai.volcengineImageModel = previousModel;
    env.ai.volcengineApiKey = previousKey;
  });


  it("compresses AI reference images as bounded JPEG data URLs", async () => {
    const dir = await mkdtemp(join(tmpdir(), "bead-ai-"));
    const inputPath = join(dir, "input.png");
    const noisy = await sharp({
      create: {
        width: 1400,
        height: 1000,
        channels: 3,
        background: { r: 240, g: 240, b: 240 }
      }
    })
      .composite([
        { input: Buffer.from('<svg width="1400" height="1000"><rect width="700" height="1000" fill="#f08080"/><circle cx="820" cy="480" r="260" fill="#58a6ff"/><path d="M120 900 L650 120 L1180 900 Z" fill="#ffd166"/></svg>'), left: 0, top: 0 }
      ])
      .png()
      .toBuffer();
    await writeFile(inputPath, noisy);

    const dataUrl = await imageFileToDataUrl(inputPath);
    const payloadBytes = Buffer.byteLength(dataUrl.split(",")[1], "base64");

    expect(dataUrl.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(payloadBytes).toBeLessThan(300_000);
  });
  it("uses distinct prompts for each AI style", () => {
    expect(promptForAiStyle("remove-background")).toContain("white background");
    expect(promptForAiStyle("cartoonize")).toContain("cartoon illustration");
    expect(promptForAiStyle("remove-background-cartoonize")).toContain("Remove or simplify the background");
  });

  it("fails clearly when AI is not configured", async () => {
    const previousProvider = env.ai.provider;
    const previousKey = env.ai.volcengineApiKey;
    env.ai.provider = "";
    env.ai.volcengineApiKey = "";

    await expect(volcengineAiImageProvider.optimizeImage("missing.png", "cartoonize", ".")).rejects.toMatchObject({
      code: "AI_NOT_CONFIGURED"
    });

    env.ai.provider = previousProvider;
    env.ai.volcengineApiKey = previousKey;
  });
});


