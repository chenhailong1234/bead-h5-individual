import { describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { buildVolcengineImageRequest, promptForAiStyle, volcengineAiImageProvider } from "../src/services/aiImage";

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
