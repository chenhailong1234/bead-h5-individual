import type { AppConfig, BeadTask, CustomerInfo, HistoryItem, VipPackage } from "./types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.code || "请求失败");
  }
  return data as T;
}

export function getAppVersion() {
  return requestJson<{ version: string }>(`/api/app/version?t=${Date.now()}`);
}
export function devLogin() {
  return requestJson<{ id: string; openid: string }>("/api/auth/dev-login", { method: "POST" });
}

export function getConfig() {
  return requestJson<AppConfig>("/api/app/config/getConfig");
}

export function getCustomerInfo() {
  return requestJson<CustomerInfo>("/api/app/customer/getInfo");
}

export function getVipPackages() {
  return requestJson<VipPackage[]>("/api/app/vip/queryList");
}

export function uploadBeadTask(formData: FormData) {
  return requestJson<{ msg: string }>("/api/app/bead/upload", { method: "POST", body: formData });
}

export function getBeadTask(logId: string) {
  return requestJson<BeadTask>(`/api/app/bead/getBeadTask?logId=${encodeURIComponent(logId)}`);
}

export function getHistory() {
  return requestJson<HistoryItem[]>("/api/app/bead/queryBeadLogList");
}

export function createPayment(vipId: string) {
  return requestJson<{ outTradeNo: string; payParams: Record<string, string> }>("/api/app/pay/create", {
    method: "POST",
    body: JSON.stringify({ vipId })
  });
}

export function mockNotify(outTradeNo: string) {
  return requestJson<{ ok: boolean }>("/api/app/pay/mock-notify", {
    method: "POST",
    body: JSON.stringify({ outTradeNo })
  });
}

