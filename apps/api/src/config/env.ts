import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function loadLocalEnv() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../../.env.local"),
    resolve(here, "../../../../.env.local")
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const lines = readFileSync(path, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      process.env[key] ??= value;
    }
    return;
  }
}

loadLocalEnv();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:4000",
  webBaseUrl: process.env.WEB_BASE_URL ?? "http://localhost:5173",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-session-secret",
  appVersion: process.env.APP_VERSION ?? "dev",
  uploadRoot: resolve(process.cwd(), "uploads"),
  ai: {
    provider: process.env.AI_PROVIDER ?? "",
    volcengineApiKey: process.env.VOLCENGINE_API_KEY ?? "",
    volcengineBaseUrl: process.env.VOLCENGINE_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3",
    volcengineImageModel: process.env.VOLCENGINE_IMAGE_MODEL ?? "doubao-seedream-4-0-250828",
    volcengineChatModel: process.env.VOLCENGINE_CHAT_MODEL ?? "doubao-seed-1-6-flash-250615"
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID ?? "",
    appSecret: process.env.WECHAT_APP_SECRET ?? "",
    mchId: process.env.WECHAT_MCH_ID ?? "",
    mchSerialNo: process.env.WECHAT_MCH_SERIAL_NO ?? "",
    privateKey: process.env.WECHAT_PRIVATE_KEY ?? "",
    apiV3Key: process.env.WECHAT_API_V3_KEY ?? "",
    notifyUrl: process.env.WECHAT_NOTIFY_URL ?? ""
  }
};

export function isWechatConfigured() {
  const values = Object.values(env.wechat);
  return values.every((value) => value.length > 0);
}


export function isAIConfigured() {
  return env.ai.provider === "volcengine" && env.ai.volcengineApiKey.length > 0;
}
