import { Router } from "express";
import { requireUser } from "../middleware/session";

export const customerRouter = Router();

customerRouter.get("/getInfo", requireUser, (req, res) => {
  res.json({
    regularCount: req.user!.regularCount,
    memberCount: req.user!.memberCount
  });
});
