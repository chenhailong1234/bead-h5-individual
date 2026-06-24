# 拼豆生成器 H5 商业版

这是一个微信内 H5 商业版拼豆图纸生成器。当前版本支持本地开发登录、模拟支付、次数扣减、任务历史、普通拼豆生成和结果预览。真实微信公众号授权与微信 JSAPI 支付已预留配置入口。

## 本地运行

```bash
pnpm install
pnpm dev
```

- H5: `http://localhost:5173`
- API: `http://localhost:4000`
- 健康检查: `http://localhost:4000/api/health`

开发环境会自动调用 `/api/auth/dev-login` 创建模拟微信用户。充值按钮会创建模拟支付订单，并通过 `/api/app/pay/mock-notify` 入账。

## 验证

```bash
pnpm test
pnpm typecheck
pnpm build
```

当前测试覆盖：

- 次数扣减、充值、失败返还。
- 拼豆颜色匹配和图片输出。
- 配置、用户、套餐接口。
- 支付创建和重复通知幂等。
- 上传生成、任务查询、历史记录。
- 微信配置缺失时的安全响应。

## 微信生产配置

上线前需要配置：

```env
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_MCH_ID=
WECHAT_MCH_SERIAL_NO=
WECHAT_PRIVATE_KEY=
WECHAT_API_V3_KEY=
WECHAT_NOTIFY_URL=
PUBLIC_BASE_URL=
SESSION_SECRET=
```

还需要在公众号和微信支付商户平台配置可信域名、支付授权目录和支付通知地址。

## 当前持久化说明

项目保留了 Prisma schema 和 seed 文件作为生产数据库模型。当前 Windows 中文路径环境下 Prisma schema engine 执行 `db push/migrate` 会空错误退出，因此本地 MVP 使用内存仓库跑通商业流程。部署到服务器或 ASCII 路径后，可切换路由服务到 Prisma 持久化。
