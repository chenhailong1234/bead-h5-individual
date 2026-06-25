import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { defaultConfig, store, type BeadTaskRecord } from "../store";
import { requireUser } from "../middleware/session";
import { deductForTask, refundForTask } from "../services/counts";
import { generateBeadImages } from "../services/beadGenerator";
import { AiImageError, getAiImageProvider } from "../services/aiImage";
import { publicUrl, saveUpload, taskOutputDir } from "../services/storage";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: defaultConfig.uploadData.maxLength } });

export const beadRouter = Router();

function parseBool(value: unknown) {
  return value === true || value === "true";
}

function parseColorLimit(value: unknown): number | "auto" {
  if (value === "auto") return "auto";
  const parsed = Number(value ?? 16);
  return Number.isFinite(parsed) ? parsed : 16;
}

function parseAiStyle(value: unknown): "remove-background" | "cartoonize" | "remove-background-cartoonize" {
  if (value === "remove-background" || value === "cartoonize" || value === "remove-background-cartoonize") {
    return value;
  }
  return "remove-background-cartoonize";
}

beadRouter.post("/upload", requireUser, upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ code: "FILE_REQUIRED", message: "请上传图片" });
    return;
  }

  const user = store.users.get(req.user!.id)!;
  const isAI = parseBool(req.body.isAI);
  let deduction;
  try {
    const deducted = deductForTask(user, isAI);
    deduction = deducted.deduction;
    store.updateUserCounts(user.id, deducted.user);
  } catch (error) {
    const code = error instanceof Error ? error.message : "NO_COUNT";
    res.status(402).json({ code, message: "生成次数不足" });
    return;
  }

  const taskId = randomUUID();
  const task: BeadTaskRecord = {
    id: taskId,
    userId: user.id,
    status: "running",
    gridSize: Number(req.body.gridSize ?? 64),
    colorLimit: parseColorLimit(req.body.colorLimit),
    brand: String(req.body.brand ?? "MARD"),
    isReversal: parseBool(req.body.isReversal),
    isAI,
    tolerance: 0,
    imageStyle: String(req.body.imageStyle ?? "卡通"),
    aiStyle: parseAiStyle(req.body.aiStyle),
    deductedCountType: deduction.type,
    deductedCount: deduction.count,
    createdAt: new Date()
  };
  store.tasks.set(task.id, task);

  try {
    const uploadPath = await saveUpload(req.file);
    const outDir = await taskOutputDir(task.id);
    let generationInputPath = uploadPath;
    if (task.isAI) {
      const optimized = await getAiImageProvider().optimizeImage(uploadPath, task.aiStyle ?? "remove-background-cartoonize", outDir);
      generationInputPath = optimized.outputPath;
      task.optimizedPath = optimized.outputPath;
    }
    const brand = defaultConfig.brandList.find((item) => item.name === task.brand) ?? defaultConfig.brandList[0];
    const generated = await generateBeadImages(generationInputPath, {
      outputDir: outDir,
      gridSize: task.gridSize,
      colorLimit: task.colorLimit,
      isReversal: task.isReversal,
      tolerance: task.tolerance,
      palette: brand.colors
    });
    Object.assign(task, {
      status: "succeeded" as const,
      originalPath: generated.originalPath,
      resultPath: generated.resultPath,
      previewPath: generated.previewPath,
      width: generated.width,
      height: generated.height,
      totalBeads: generated.totalBeads,
      selectedColorCount: generated.selectedColorCount,
      usage: generated.usage,
      completedAt: new Date()
    });
    res.json({ msg: task.id });
  } catch (error) {
    const current = store.users.get(user.id)!;
    store.updateUserCounts(user.id, refundForTask(current, task.deductedCountType, task.deductedCount));
    const isAiError = error instanceof AiImageError;
    const errorMessage = error instanceof Error ? error.message : "生成失败";
    Object.assign(task, {
      status: "failed" as const,
      errorMessage,
      completedAt: new Date()
    });
    console.error("Bead task failed", {
      taskId: task.id,
      userId: task.userId,
      isAI: task.isAI,
      aiStyle: task.aiStyle,
      errorCode: isAiError ? error.code : "TASK_FAILED",
      errorMessage,
      details: isAiError ? error.details : undefined,
      refunded: task.deductedCount,
      refundedType: task.deductedCountType
    });
    res.status(500).json({
      code: isAiError ? error.code : "TASK_FAILED",
      message: isAiError ? errorMessage : "生成失败"
    });
  }
});

beadRouter.get("/getBeadTask", requireUser, (req, res) => {
  const task = store.tasks.get(String(req.query.logId ?? ""));
  if (!task || task.userId !== req.user!.id) {
    res.status(404).json({ code: "TASK_NOT_FOUND", message: "未找到生成记录" });
    return;
  }

  res.json({
    ...task,
    original: task.originalPath ? publicUrl(task.originalPath) : "",
    result: task.resultPath ? publicUrl(task.resultPath) : "",
    preview: task.previewPath ? publicUrl(task.previewPath) : "",
    optimized: task.optimizedPath ? publicUrl(task.optimizedPath) : "",
    absoluteResultPath: task.resultPath
  });
});

beadRouter.get("/queryBeadLogList", requireUser, (req, res) => {
  const tasks = [...store.tasks.values()]
    .filter((task) => task.userId === req.user!.id)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((task) => ({
      id: task.id,
      status: task.status,
      generateTime: task.createdAt.toLocaleString("zh-CN"),
      results: task.previewPath ? publicUrl(task.previewPath) : task.resultPath ? publicUrl(task.resultPath) : "",
      gridSize: task.gridSize,
      colorLimit: task.colorLimit,
      brand: task.brand,
      isReversal: task.isReversal,
      isAI: task.isAI,
      tolerance: task.tolerance,
      imageStyle: task.imageStyle,
      width: task.width,
      height: task.height,
      totalBeads: task.totalBeads,
      selectedColorCount: task.selectedColorCount,
      aiStyle: task.aiStyle
    }));
  res.json(tasks);
});


