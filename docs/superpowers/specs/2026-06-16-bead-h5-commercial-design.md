# Bead H5 Commercial Design

## Goal

Build a WeChat-in-browser H5 commercial bead-pattern generator modeled after `https://sqx.ink/pages/index/bead`.

The first production slice ships real WeChat official-account authorization, real JSAPI payment, paid usage counts, generation history, and a working normal bead generator. AI optimization is exposed as a paid capability in the UI and data model, but the first implementation keeps the AI processing path behind an interface so it can be added without changing the product flow.

## Product Scope

### Included

- WeChat H5 landing page with a layout close to the reference page.
- WeChat browser detection and guidance when opened outside WeChat.
- Official-account OAuth login that binds a local user record to a WeChat `openid`.
- Image upload for one JPG, PNG, JPEG, or WEBP file, capped at 2 MB after client/server validation.
- Brand selection driven by backend config.
- Base settings:
  - Reverse colors.
  - AI mode toggle.
  - AI style selection when AI mode is enabled.
- Detail settings:
  - Tolerance.
  - Grid size.
  - Color limit.
- Normal bead generation:
  - Resize image to a square or bounded grid.
  - Map pixels to the selected brand color palette.
  - Produce original, result, and preview images.
- Task progress screen and polling.
- Generation history for the current WeChat user.
- Usage counts:
  - `regularCount` for normal generation.
  - `memberCount` for AI generation.
  - `-1` means unlimited.
- Paid recharge packages.
- WeChat JSAPI payment.
- Payment notification verification and count crediting.
- Failure handling that refunds consumed counts when a task fails after deducting them.

### Excluded From First Slice

- Admin dashboard.
- Real AI optimization implementation.
- Multi-user team management.
- Cloud object storage integration.
- Mini program packaging.

These are intentionally deferred, but the API and data model leave room for them.

## User Flow

1. User opens the H5 page inside WeChat.
2. The app checks for a session. If missing, it redirects through official-account OAuth.
3. Backend receives OAuth code, gets `openid`, creates or loads the user, and sets an HTTP-only session.
4. H5 loads config, user counts, packages, and history.
5. User uploads one image.
6. User selects brand and settings.
7. User taps generate.
8. Backend validates count availability, deducts the required count, creates a task, and starts processing.
9. H5 polls task status every 3 seconds.
10. On success, H5 shows original, result, and preview tabs, and history is updated.
11. On failure, backend marks the task failed and returns the deducted count.
12. User can open recharge, choose a package, pay through WeChat JSAPI, and receive extra counts after payment notify succeeds.

## Frontend Design

Use Vue 3 and Vite for the H5 app.

### Pages And Panels

- Main generator page:
  - Activity banner.
  - Upload card.
  - Brand selector card.
  - Settings card with base and detail sections.
  - Count display.
  - Generate button.
  - History button.
  - Result tabs after task success: original, result, preview.
- Recharge modal:
  - Normal package and AI package groups.
  - Price, count, unit price, and saving badge.
  - Pay button.
- History drawer:
  - List entries with thumbnail, short ID, generation time, and status.
  - Tap entry to reload task result.
- Loading overlay:
  - Progress bar.
  - Rotating status text.
  - Notes that normal mode is quick and AI mode is slower.
- Out-of-WeChat page:
  - Explains that payment and login require opening in WeChat.

### Visual Direction

Match the reference product without copying exact proprietary assets:

- Light lavender page background.
- White rounded cards.
- Purple primary color.
- Gradient generate button.
- Compact mobile-first layout.
- Settings grouped as simple rows, switches, sliders, and horizontal option chips.

## Backend Design

Use Node.js, Express, Prisma, and SQLite for the first implementation. Keep the database layer portable so it can move to MySQL or PostgreSQL for deployment.

### Services

- Auth service:
  - Builds WeChat OAuth URL.
  - Exchanges OAuth code for `openid`.
  - Creates session.
- Config service:
  - Serves upload limits, brand palettes, style options, switches, and sliders.
- Customer service:
  - Returns user counts.
- Payment service:
  - Lists packages.
  - Creates WeChat JSAPI payment orders.
  - Verifies payment notifications.
  - Credits counts idempotently.
- Bead task service:
  - Validates upload and count availability.
  - Deducts count.
  - Runs normal generation.
  - Stores generated image paths.
  - Refunds count on task failure.
- Storage service:
  - Saves upload and generated images under `uploads/`.
  - Exposes safe static URLs.

## API Contract

Prefix API routes with `/api`.

### Auth

- `GET /api/auth/wechat/start`
  - Redirects to WeChat OAuth.
- `GET /api/auth/wechat/callback`
  - Receives `code`, creates session, redirects to the app.

### Config

- `GET /api/app/config/getConfig`
  - Returns upload config, brand list, style list, base setting switches, and detail sliders.

### Customer

- `GET /api/app/customer/getInfo`
  - Returns `regularCount` and `memberCount`.

### Bead

- `POST /api/app/bead/upload`
  - Multipart fields: `file`, `gridSize`, `colorLimit`, `brand`, `isAI`, `isReversal`, `tolerance`, `imageStyle`, `logId`.
  - Returns `{ msg: taskId }`.
- `GET /api/app/bead/getBeadTask?logId=...`
  - Returns task status and generated image URLs.
- `GET /api/app/bead/queryBeadLogList`
  - Returns current user's task history.

### VIP And Payment

- `GET /api/app/vip/queryList`
  - Returns available packages grouped by normal and AI type.
- `POST /api/app/pay/create`
  - Body: `{ vipId }`.
  - Returns WeChat JSAPI pay parameters and local order ID.
- `POST /api/app/pay/notify`
  - WeChat payment callback.
  - Verifies signature, marks paid, credits count.

## Data Model

### User

- `id`
- `openid`
- `nickname`
- `avatarUrl`
- `regularCount`
- `memberCount`
- `createdAt`
- `updatedAt`

### VipPackage

- `id`
- `type`: `normal` or `ai`
- `title`
- `remark`
- `originalPrice`
- `currentPrice`
- `count`
- `enabled`
- `sortOrder`

### PaymentOrder

- `id`
- `userId`
- `vipPackageId`
- `outTradeNo`
- `amount`
- `status`: `pending`, `paid`, `closed`, `failed`
- `transactionId`
- `rawNotify`
- `createdAt`
- `paidAt`

### BeadTask

- `id`
- `userId`
- `status`: `running`, `succeeded`, `failed`, `violation`
- `gridSize`
- `colorLimit`
- `brand`
- `isReversal`
- `isAI`
- `tolerance`
- `imageStyle`
- `deductedCountType`
- `deductedCount`
- `originalPath`
- `resultPath`
- `previewPath`
- `errorMessage`
- `createdAt`
- `completedAt`

### AppConfig

- `key`
- `valueJson`
- `updatedAt`

## Generation Algorithm

Normal generation runs server-side:

1. Decode image and normalize orientation.
2. Resize/crop to target grid dimensions.
3. Optionally reverse colors.
4. Apply tolerance adjustment by nudging colors toward stronger palette matches.
5. Quantize to `colorLimit`.
6. Map each pixel to nearest color in the selected brand palette.
7. Render:
   - Result image: bead-like grid with circular beads.
   - Preview image: larger printable grid with optional color labels.
   - Original image: normalized uploaded image.
8. Save images and update the task.

The first implementation can use a small built-in MARD-like palette for development. Production can replace this with an editable backend config.

## WeChat Integration

Required environment variables:

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `WECHAT_MCH_ID`
- `WECHAT_MCH_SERIAL_NO`
- `WECHAT_PRIVATE_KEY`
- `WECHAT_API_V3_KEY`
- `WECHAT_NOTIFY_URL`
- `PUBLIC_BASE_URL`
- `SESSION_SECRET`

Payment flow:

1. Frontend calls `POST /api/app/pay/create`.
2. Backend creates a local pending order.
3. Backend calls WeChat pay transactions JSAPI endpoint using the user's `openid`.
4. Backend signs returned payment parameters.
5. Frontend calls `WeixinJSBridge.invoke("getBrandWCPayRequest", params)`.
6. WeChat sends notify to `/api/app/pay/notify`.
7. Backend verifies notify signature and decrypts resource.
8. Backend marks order paid and credits counts once.

## Error Handling

- Outside WeChat: show the out-of-WeChat page for login/payment flows.
- Missing session: redirect to OAuth.
- No count: open recharge modal.
- Upload invalid: show format or size message.
- Generation failure after deduction: refund count and show failure message.
- Payment cancelled: keep order pending or close it after expiry.
- Duplicate payment notify: do not credit twice.
- Poll timeout: keep task in history and let user reopen it.

## Verification

### Automated Checks

- Unit tests for count deduction/refund.
- Unit tests for nearest color mapping.
- Unit tests for payment notify idempotency.
- API tests for config, customer info, package listing, task creation, and history.

### Manual Checks

- Open H5 outside WeChat and see guidance.
- Open H5 with a mocked WeChat session and generate a normal task.
- Confirm regular count deducts on start and does not double deduct when polling.
- Force generation failure and confirm count refund.
- Create a mock paid order and confirm count crediting.
- Verify the UI at mobile widths similar to WeChat browser.

## Implementation Order

1. Scaffold monorepo with `apps/web` and `apps/api`.
2. Create Prisma schema and seed packages/config.
3. Implement auth/session skeleton with mocked development login.
4. Implement frontend layout matching the reference.
5. Implement config, customer, package, and history APIs.
6. Implement upload and normal generation.
7. Implement task polling and result rendering.
8. Implement payment order lifecycle with a development mock.
9. Add real WeChat OAuth and JSAPI payment behind environment config.
10. Add tests and mobile browser verification.
