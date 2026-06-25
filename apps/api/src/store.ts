import { randomUUID } from "node:crypto";
import { mard221Palette } from "./data/mard221";

export type UserRecord = {
  id: string;
  openid: string;
  nickname?: string;
  avatarUrl?: string;
  regularCount: number;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type VipPackageRecord = {
  id: string;
  type: "normal" | "ai";
  title: string;
  remark: string;
  originalPrice: number;
  currentPrice: number;
  count: number;
  enabled: boolean;
  sortOrder: number;
};

export type PaymentOrderRecord = {
  id: string;
  userId: string;
  vipPackageId: string;
  outTradeNo: string;
  amount: number;
  status: "pending" | "paid" | "closed" | "failed";
  transactionId?: string;
  rawNotify?: string;
  createdAt: Date;
  paidAt?: Date;
};

export type TaskColorUsage = {
  code: string;
  hex: string;
  count: number;
};

export type BeadTaskRecord = {
  id: string;
  userId: string;
  status: "running" | "succeeded" | "failed" | "violation";
  gridSize: number;
  gridWidth: number;
  gridHeight: number;
  colorLimit: number | "auto";
  selectedColorCount?: number;
  brand: string;
  isReversal: boolean;
  isAI: boolean;
  tolerance: number;
  imageStyle: string;
  aiStyle?: "remove-background" | "cartoonize" | "remove-background-cartoonize";
  optimizedPath?: string;
  deductedCountType?: "regular" | "ai";
  deductedCount: number;
  originalPath?: string;
  resultPath?: string;
  previewPath?: string;
  width?: number;
  height?: number;
  totalBeads?: number;
  usage?: TaskColorUsage[];
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
};

export const defaultConfig = {
  uploadData: {
    title: "点击上传图片",
    maxLength: 10 * 1024 * 1024,
    typeList: ["jpg", "png", "jpeg", "webp"],
    remark: "单张图片最大 10MB"
  },
  brandList: [{ name: "MARD", label: "MARD", colors: mard221Palette }],
  styleList: [
    { name: "卡通", icon: "" },
    { name: "写实", icon: "" },
    { name: "像素", icon: "" }
  ],
  isReversal: { name: "反色", value: false, tips: "反转明暗区域" },
  isAI: { name: "AI 优化", value: false, tips: "去背景、卡通化或去背景+卡通化后再生成图纸" },
  tolerance: {
    name: "容差",
    value: 0,
    tips: "数值越高，颜色合并越明显",
    list: [
      { label: "低", value: 0 },
      { label: "中", value: 12 },
      { label: "高", value: 24 }
    ]
  },
  gridSize: {
    name: "豆板规格",
    value: "78x78",
    tips: "选择最终图纸宽高",
    list: [
      { label: "52 x 52", value: "52x52" },
      { label: "52 x 104", value: "52x104" },
      { label: "104 x 52", value: "104x52" },
      { label: "78 x 78", value: "78x78" },
      { label: "78 x 156", value: "78x156" },
      { label: "156 x 78", value: "156x78" },
      { label: "104 x 104", value: "104x104" },
      { label: "104 x 208", value: "104x208" },
      { label: "208 x 104", value: "208x104" }
    ]
  },
  colorLimit: {
    name: "颜色",
    value: 16,
    tips: "最多使用的色号数量",
    list: [
      { label: "16", value: 16 },
      { label: "24", value: 24 },
      { label: "32", value: 32 },
      { label: "42", value: 42 },
      { label: "64", value: 64 },
      { label: "96", value: 96 },
      { label: "自动", value: "auto" }
    ]
  }
};

export class MemoryStore {
  users = new Map<string, UserRecord>();
  packages = new Map<string, VipPackageRecord>();
  orders = new Map<string, PaymentOrderRecord>();
  tasks = new Map<string, BeadTaskRecord>();

  constructor() {
    this.reset();
  }

  reset() {
    this.users.clear();
    this.orders.clear();
    this.tasks.clear();
    this.packages.clear();
    this.packages.set("normal-10", {
      id: "normal-10",
      type: "normal",
      title: "普通套餐",
      remark: "用于普通拼豆图纸生成",
      originalPrice: 990,
      currentPrice: 490,
      count: 10,
      enabled: true,
      sortOrder: 1
    });
    this.packages.set("ai-5", {
      id: "ai-5",
      type: "ai",
      title: "AI 套餐",
      remark: "用于 AI 优化图纸生成",
      originalPrice: 1990,
      currentPrice: 990,
      count: 5,
      enabled: true,
      sortOrder: 2
    });
  }

  findOrCreateUser(openid: string, counts = { regularCount: 1, memberCount: 0 }) {
    const existing = [...this.users.values()].find((user) => user.openid === openid);
    if (existing) return existing;
    const now = new Date();
    const user: UserRecord = { id: randomUUID(), openid, ...counts, createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }

  updateUserCounts(userId: string, counts: { regularCount: number; memberCount: number }) {
    const user = this.users.get(userId);
    if (!user) throw new Error("USER_NOT_FOUND");
    Object.assign(user, counts, { updatedAt: new Date() });
    return user;
  }
}

export const store = new MemoryStore();











