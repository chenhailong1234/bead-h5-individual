import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import { env } from "./config/env";
import { attachUser, sessionMiddleware } from "./middleware/session";
import { authRouter } from "./routes/auth";
import { beadRouter } from "./routes/bead";
import { configRouter } from "./routes/config";
import { customerRouter } from "./routes/customer";
import { payRouter } from "./routes/pay";
import { vipRouter } from "./routes/vip";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(sessionMiddleware());
  app.use(attachUser);
  app.use("/uploads", express.static(env.uploadRoot));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/api/app/version", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ version: env.appVersion });
  });
  app.use("/api/auth", authRouter);
  app.use("/api/app/config", configRouter);
  app.use("/api/app/customer", customerRouter);
  app.use("/api/app/vip", vipRouter);
  app.use("/api/app/pay", payRouter);
  app.use("/api/app/bead", beadRouter);
  app.use(errorHandler);

  return app;
}

const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ code: "FILE_TOO_LARGE", message: "图片太大，已超过 10MB，请换一张更小的图片" });
    return;
  }

  next(error);
};


