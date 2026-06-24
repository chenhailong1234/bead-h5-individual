import { randomUUID } from "node:crypto";

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
  colorLimit: number;
  brand: string;
  isReversal: boolean;
  isAI: boolean;
  tolerance: number;
  imageStyle: string;
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

const mardPalette = [
  { name: "H16", hex: "#171719" },
  { name: "H6", hex: "#303135" },
  { name: "B23", hex: "#526050" },
  { name: "M7", hex: "#8f8980" },
  { name: "H4", hex: "#a7acaa" },
  { name: "M9", hex: "#b99d78" },
  { name: "G17", hex: "#8f5b5b" },
  { name: "H8", hex: "#eadadd" },
  { name: "F20", hex: "#ee94ac" },
  { name: "M15", hex: "#708a7e" },
  { name: "M12", hex: "#64504d" },
  { name: "G14", hex: "#6f3e33" },
  { name: "G8", hex: "#793737" },
  { name: "M1", hex: "#eef3e9" },
  { name: "B22", hex: "#7ecb72" },
  { name: "B18", hex: "#b8e3a6" },
  { name: "P6", hex: "#f3b9c8" },
  { name: "P3", hex: "#e87da1" },
  { name: "Y5", hex: "#d4b15d" },
  { name: "C4", hex: "#75bdd3" },
  { name: "V6", hex: "#8066ae" },
  { name: "W1", hex: "#ffffff" },
  { name: "O7", hex: "#c4763b" },
  { name: "R2", hex: "#b92e35" }
];

export const defaultConfig = {
  uploadData: {
    title: "点击上传图片",
    maxLength: 10 * 1024 * 1024,
    typeList: ["jpg", "png", "jpeg", "webp"],
    remark: "单张图片最大 10MB"
  },
  brandList: [{ name: "MARD", label: "MARD", colors: mardPalette }],
  styleList: [
    { name: "卡通", icon: "" },
    { name: "写实", icon: "" },
    { name: "像素", icon: "" }
  ],
  isReversal: { name: "反色", value: false, tips: "反转明暗区域" },
  isAI: { name: "AI 优化", value: false, tips: "预留 AI 生成能力" },
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
    name: "尺寸",
    value: 64,
    tips: "长边豆子数量",
    list: [
      { label: "32", value: 32 },
      { label: "48", value: 48 },
      { label: "64", value: 64 },
      { label: "96", value: 96 }
    ]
  },
  colorLimit: {
    name: "颜色",
    value: 16,
    tips: "最多使用的色号数量",
    list: [
      { label: "8", value: 8 },
      { label: "12", value: 12 },
      { label: "16", value: 16 },
      { label: "24", value: 24 },
      { label: "30", value: 30 }
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



