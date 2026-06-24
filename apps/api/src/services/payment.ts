import { randomUUID } from "node:crypto";
import { applyCredit } from "./counts";
import { store } from "../store";

export function buildMockJsapiParams(outTradeNo: string) {
  return {
    appId: "mock-app-id",
    timeStamp: `${Math.floor(Date.now() / 1000)}`,
    nonceStr: randomUUID().replaceAll("-", ""),
    package: `prepay_id=mock_${outTradeNo}`,
    signType: "RSA",
    paySign: "mock-signature"
  };
}

export function createPaymentOrder(userId: string, vipId: string) {
  const pkg = store.packages.get(vipId);
  if (!pkg || !pkg.enabled) {
    throw new Error("VIP_PACKAGE_NOT_FOUND");
  }

  const order = {
    id: randomUUID(),
    userId,
    vipPackageId: vipId,
    outTradeNo: `B${Date.now()}${Math.floor(Math.random() * 10000)}`,
    amount: pkg.currentPrice,
    status: "pending" as const,
    createdAt: new Date()
  };
  store.orders.set(order.id, order);

  return {
    order,
    payParams: buildMockJsapiParams(order.outTradeNo)
  };
}

export function markOrderPaid(outTradeNo: string, transactionId = `mock-${outTradeNo}`) {
  const order = [...store.orders.values()].find((candidate) => candidate.outTradeNo === outTradeNo);
  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.status === "paid") {
    return order;
  }

  const pkg = store.packages.get(order.vipPackageId);
  const user = store.users.get(order.userId);
  if (!pkg || !user) {
    throw new Error("ORDER_RELATION_NOT_FOUND");
  }

  const credited = applyCredit(user, pkg.type, pkg.count);
  store.updateUserCounts(user.id, credited);
  Object.assign(order, {
    status: "paid" as const,
    transactionId,
    paidAt: new Date()
  });
  return order;
}
