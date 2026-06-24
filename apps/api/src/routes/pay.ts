import { Router } from "express";
import { isWechatConfigured } from "../config/env";
import { requireUser } from "../middleware/session";
import { createPaymentOrder, markOrderPaid } from "../services/payment";

export const payRouter = Router();

payRouter.post("/create", requireUser, (req, res) => {
  try {
    const { order, payParams } = createPaymentOrder(req.user!.id, String(req.body.vipId ?? ""));
    res.json({ orderId: order.id, outTradeNo: order.outTradeNo, payParams });
  } catch (error) {
    res.status(404).json({ code: "VIP_PACKAGE_NOT_FOUND", message: "套餐不存在" });
  }
});

payRouter.post("/mock-notify", requireUser, (req, res) => {
  try {
    const order = markOrderPaid(String(req.body.outTradeNo ?? ""));
    res.json({ ok: true, status: order.status });
  } catch (error) {
    res.status(404).json({ code: "ORDER_NOT_FOUND", message: "订单不存在" });
  }
});

payRouter.post("/notify", (_req, res) => {
  if (!isWechatConfigured()) {
    res.status(501).json({ code: "WECHAT_PAY_NOT_CONFIGURED", message: "微信支付尚未配置" });
    return;
  }
  res.status(501).json({ code: "WECHAT_PAY_PENDING", message: "微信支付通知接口已预留" });
});
