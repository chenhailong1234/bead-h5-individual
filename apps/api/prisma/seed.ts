import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const palette = [
  { name: "黑色", hex: "#1f1f24" },
  { name: "白色", hex: "#f8f8f4" },
  { name: "红色", hex: "#d93b3b" },
  { name: "粉色", hex: "#f2a3bd" },
  { name: "橙色", hex: "#f58a32" },
  { name: "黄色", hex: "#f6d64a" },
  { name: "浅绿", hex: "#8ccf7e" },
  { name: "绿色", hex: "#2c9b63" },
  { name: "浅蓝", hex: "#7fc7e8" },
  { name: "蓝色", hex: "#3676c9" },
  { name: "紫色", hex: "#7f5ac7" },
  { name: "棕色", hex: "#8a5a3c" }
];

async function main() {
  await prisma.vipPackage.upsert({
    where: { id: "normal-10" },
    update: {},
    create: {
      id: "normal-10",
      type: "normal",
      title: "普通次数包",
      remark: "适合日常生成拼豆图纸",
      originalPrice: 990,
      currentPrice: 490,
      count: 10,
      sortOrder: 1
    }
  });

  await prisma.vipPackage.upsert({
    where: { id: "ai-5" },
    update: {},
    create: {
      id: "ai-5",
      type: "ai",
      title: "AI 优化包",
      remark: "用于 AI 风格优化和高清图纸",
      originalPrice: 1990,
      currentPrice: 990,
      count: 5,
      sortOrder: 2
    }
  });

  const config = {
    uploadData: {
      title: "点击上传图片",
      maxLength: 2_097_152,
      typeList: ["jpg", "png", "jpeg", "webp"],
      remark: "支持单张图片,最大2MB"
    },
    brandList: [{ name: "MARD", label: "MARD", colors: palette }],
    styleList: [
      { name: "卡通", icon: "" },
      { name: "写实", icon: "" },
      { name: "像素", icon: "" }
    ],
    isReversal: { name: "反色", value: false, tips: "适合深浅关系需要反转的图案" },
    isAI: { name: "AI优化", value: false, tips: "开启后使用 AI 次数，第一版预留入口" },
    tolerance: {
      name: "容差",
      value: 0,
      tips: "数值越高，颜色会更集中",
      list: [
        { label: "低", value: 0 },
        { label: "中", value: 12 },
        { label: "高", value: 24 }
      ]
    },
    gridSize: {
      name: "尺寸",
      value: 64,
      tips: "拼豆图纸的网格边长",
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
      tips: "参与生成的最大颜色数量",
      list: [
        { label: "8", value: 8 },
        { label: "12", value: 12 },
        { label: "16", value: 16 },
        { label: "24", value: 24 }
      ]
    }
  };

  await prisma.appConfig.upsert({
    where: { key: "beadConfig" },
    update: { valueJson: JSON.stringify(config) },
    create: { key: "beadConfig", valueJson: JSON.stringify(config) }
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
