import { Router } from "express";
import { defaultConfig } from "../store";

export const configRouter = Router();

configRouter.get("/getConfig", (_req, res) => {
  res.json(defaultConfig);
});
