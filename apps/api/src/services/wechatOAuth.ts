export function buildWechatOAuthUrl(appId: string, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "snsapi_base",
    state
  });
  return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
}
