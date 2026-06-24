import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { env, isAIConfigured } from "../config/env";

export type AiStyle = "remove-background" | "cartoonize" | "remove-background-cartoonize";

export type AiImageProvider = {
  optimizeImage(inputPath: string, style: AiStyle, outputDir: string): Promise<{ outputPath: string }>;
};

export class AiImageError extends Error {
  constructor(
    public code: string,
    message: string,
    public details: { status?: number; providerCode?: string; providerMessage?: string; stage?: string } = {}
  ) {
    super(message);
  }
}

export function promptForAiStyle(style: AiStyle) {
  const base = "Keep the main subject recognizable. Create a clean image suitable for conversion into pixel bead art. Use clear color blocks, smooth edges, and avoid tiny noisy details.";
  if (style === "remove-background") {
    return `${base} Remove distracting background and place the subject on a clean white background. Do not change the subject style or identity.`;
  }
  if (style === "cartoonize") {
    return `${base} Convert the reference image into a polished soft cartoon illustration while preserving the subject pose, identity, and important shapes.`;
  }
  return `${base} Remove or simplify the background, then convert the subject into a polished soft cartoon illustration. Preserve the subject pose, identity, and important shapes.`;
}

export async function imageFileToDataUrl(inputPath: string) {
  const buffer = await sharp(inputPath)
    .rotate()
    .resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function buildVolcengineImageRequest(imageDataUrl: string, style: AiStyle) {
  return {
    model: env.ai.volcengineImageModel,
    prompt: promptForAiStyle(style),
    image: imageDataUrl,
    size: "1024x1024"
  };
}

async function downloadImage(url: string, outputPath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new AiImageError("AI_IMAGE_DOWNLOAD_FAILED", "AI 图片下载失败", { status: response.status, stage: "download" });
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

export const volcengineAiImageProvider: AiImageProvider = {
  async optimizeImage(inputPath, style, outputDir) {
    if (!isAIConfigured()) {
      throw new AiImageError("AI_NOT_CONFIGURED", "AI 服务暂未配置", { stage: "config" });
    }

    await mkdir(outputDir, { recursive: true });
    const imageDataUrl = await imageFileToDataUrl(inputPath);
    const requestBody = buildVolcengineImageRequest(imageDataUrl, style);
    const response = await fetch(`${env.ai.volcengineBaseUrl.replace(/\/$/, "")}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ai.volcengineApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let providerCode = "";
      let providerMessage = errorText.slice(0, 500);
      try {
        const parsed = JSON.parse(errorText) as { error?: { code?: string; message?: string }; code?: string; message?: string };
        providerCode = parsed.error?.code ?? parsed.code ?? "";
        providerMessage = parsed.error?.message ?? parsed.message ?? providerMessage;
      } catch {}
      console.error("AI provider request failed", {
        status: response.status,
        providerCode,
        providerMessage,
        model: env.ai.volcengineImageModel,
        stage: "provider"
      });
      throw new AiImageError("AI_PROVIDER_FAILED", "AI 优化失败，请稍后再试", {
        status: response.status,
        providerCode,
        providerMessage,
        stage: "provider"
      });
    }

    const data = await response.json() as { data?: Array<{ url?: string; b64_json?: string }> };
    const item = data.data?.[0];
    const outputPath = join(outputDir, "ai-optimized.png");
    if (item?.b64_json) {
      await writeFile(outputPath, Buffer.from(item.b64_json, "base64"));
      return { outputPath };
    }
    if (item?.url) {
      await downloadImage(item.url, outputPath);
      return { outputPath };
    }

    throw new AiImageError("AI_EMPTY_RESULT", "AI 未返回图片", { stage: "provider" });
  }
};

export function getAiImageProvider(): AiImageProvider {
  return volcengineAiImageProvider;
}
