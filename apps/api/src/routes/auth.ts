import { Router } from "express";
import { isWechatConfigured } from "../config/env";
import { store } from "../store";

export const authRouter = Router();

authRouter.post("/dev-login", (req, res) => {
  const user = store.findOrCreateUser("dev-openid", { regularCount: 1, memberCount: 0 });
  req.session.userId = user.id;
  res.json({ id: user.id, openid: user.openid });
});

authRouter.get("/wechat/start", (_req, res) => {
  if (!isWechatConfigured()) {
    res.status(501).json({ code: "WECHAT_NOT_CONFIGURED", message: "微信授权尚未配置" });
    return;
  }
  res.status(501).json({ code: "WECHAT_OAUTH_PENDING", message: "微信授权接口已预留" });
});
