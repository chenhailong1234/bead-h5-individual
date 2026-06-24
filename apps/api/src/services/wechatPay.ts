export type WechatPayConfig = {
  appId: string;
  mchId: string;
  mchSerialNo: string;
  privateKey: string;
  apiV3Key: string;
  notifyUrl: string;
};

export function isWechatPayConfigured(config: WechatPayConfig) {
  return Object.values(config).every((value) => value.trim().length > 0);
}
