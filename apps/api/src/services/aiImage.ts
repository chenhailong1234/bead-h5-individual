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
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

export function buildVolcengineImageRequest(imageDataUrl: string, style: AiStyle) {
  return {
    model: env.ai.volcengineImageModel,
    prompt: promptForAiStyle(style),
    image: imageDataUrl,
    size: "1024x1024"
  };
}

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: Parameters<typeof fetch>[1],
  timeoutMs: number,
  stage: string
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    const providerMessage = error instanceof Error ? error.message : String(error);
    const providerCode = error instanceof Error ? error.name : "";
    console.error("AI network request failed", {
      stage,
      providerCode,
      providerMessage,
      timeoutMs
    });
    throw new AiImageError("AI_NETWORK_FAILED", "AI 请求超时或网络失败，请稍后再试", {
      providerCode,
      providerMessage,
      stage
    });
  } finally {
    clearTimeout(timeout);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url: string, outputPath: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, undefined, 60_000, "download");
      if (!response.ok) {
        throw new AiImageError("AI_IMAGE_DOWNLOAD_FAILED", "AI 图片下载失败", { status: response.status, stage: "download" });
      }
      const arrayBuffer = await response.arrayBuffer();
      await writeFile(outputPath, Buffer.from(arrayBuffer));
      return;
    } catch (error) {
      lastError = error;
      console.warn("AI image download attempt failed", {
        attempt,
        maxAttempts: 3,
        host: new URL(url).host,
        errorCode: error instanceof AiImageError ? error.code : error instanceof Error ? error.name : "UNKNOWN",
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      if (attempt < 3) {
        await delay(attempt * 1500);
      }
    }
  }

  if (lastError instanceof AiImageError) {
    throw lastError;
  }
  throw new AiImageError("AI_IMAGE_DOWNLOAD_FAILED", "AI 图片下载失败", { stage: "download" });
}

export const volcengineAiImageProvider: AiImageProvider = {
  async optimizeImage(inputPath, style, outputDir) {
    if (!isAIConfigured()) {
      throw new AiImageError("AI_NOT_CONFIGURED", "AI 服务暂未配置", { stage: "config" });
    }

    await mkdir(outputDir, { recursive: true });
    const imageDataUrl = await imageFileToDataUrl(inputPath);
    const requestBody = buildVolcengineImageRequest(imageDataUrl, style);
    console.info("AI provider request started", {
      model: env.ai.volcengineImageModel,
      style,
      stage: "provider"
    });
    const response = await fetchWithTimeout(`${env.ai.volcengineBaseUrl.replace(/\/$/, "")}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.ai.volcengineApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    }, 180_000, "provider");

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
    console.info("AI provider request completed", {
      model: env.ai.volcengineImageModel,
      hasBase64: Boolean(item?.b64_json),
      hasUrl: Boolean(item?.url),
      stage: "provider"
    });
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



