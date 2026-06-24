import { Router } from "express";
import { store } from "../store";

export const vipRouter = Router();

vipRouter.get("/queryList", (_req, res) => {
  res.json([...store.packages.values()].filter((pkg) => pkg.enabled).sort((a, b) => a.sortOrder - b.sortOrder));
});
