import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { env } from "../config/env";

export async function saveUpload(file: Express.Multer.File) {
  const dir = join(env.uploadRoot, "originals");
  await mkdir(dir, { recursive: true });
  const ext = extname(file.originalname) || ".png";
  const path = join(dir, `${randomUUID()}${ext}`);
  await writeFile(path, file.buffer);
  return path;
}

export async function taskOutputDir(taskId: string) {
  const dir = join(env.uploadRoot, "results", taskId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function publicUrl(absPath: string) {
  const rel = relative(env.uploadRoot, resolve(absPath)).replaceAll("\\", "/");
  return `/uploads/${rel}`;
}
