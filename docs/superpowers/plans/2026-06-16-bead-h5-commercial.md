# Bead H5 Commercial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WeChat-in-browser H5 commercial bead-pattern generator with mocked development auth/payment, real task/history/count logic, and a normal bead generator ready for later real WeChat credentials.

**Architecture:** Create a pnpm workspace with `apps/api` and `apps/web`. The API owns sessions, payment orders, task state, count accounting, image processing, and static generated assets; the H5 app consumes the API and mirrors the reference page's commercial flow.

**Tech Stack:** Node.js, TypeScript, Express, Prisma, SQLite, Vitest, Sharp, Vue 3, Vite.

---

## File Map

- `package.json`: workspace scripts.
- `pnpm-workspace.yaml`: workspace package globs.
- `apps/api/package.json`: API scripts and dependencies.
- `apps/api/tsconfig.json`: API TypeScript config.
- `apps/api/vitest.config.ts`: API test config.
- `apps/api/prisma/schema.prisma`: SQLite data model.
- `apps/api/prisma/seed.ts`: default packages and app config.
- `apps/api/src/app.ts`: Express app assembly.
- `apps/api/src/server.ts`: HTTP entrypoint.
- `apps/api/src/config/env.ts`: environment parsing and defaults.
- `apps/api/src/db.ts`: Prisma client.
- `apps/api/src/middleware/session.ts`: development session and user loading.
- `apps/api/src/routes/*.ts`: route modules.
- `apps/api/src/services/counts.ts`: count deduction, credit, refund.
- `apps/api/src/services/beadGenerator.ts`: normal bead image generation.
- `apps/api/src/services/payment.ts`: mock payment and WeChat-ready order lifecycle.
- `apps/api/src/services/storage.ts`: upload/result file paths and URLs.
- `apps/api/src/services/appConfig.ts`: config payload for frontend.
- `apps/api/tests/*.test.ts`: backend behavior tests.
- `apps/web/package.json`: web scripts and dependencies.
- `apps/web/tsconfig.json`: web TypeScript config.
- `apps/web/vite.config.ts`: Vite dev proxy.
- `apps/web/index.html`: web entry shell.
- `apps/web/src/main.ts`: Vue bootstrap.
- `apps/web/src/App.vue`: H5 UI.
- `apps/web/src/api.ts`: typed API client.
- `apps/web/src/types.ts`: shared frontend types.
- `apps/web/src/styles.css`: mobile visual system.

## Task 1: Scaffold Workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`

- [ ] **Step 1: Create workspace manifests**

Create root files:

```json
{
  "name": "bead-h5-commercial",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel dev",
    "build": "pnpm --recursive build",
    "test": "pnpm --filter @bead/api test",
    "typecheck": "pnpm --recursive typecheck"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

```yaml
packages:
  - "apps/*"
```

- [ ] **Step 2: Create API package files**

Use this `apps/api/package.json`:

```json
{
  "name": "@bead/api",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "express-session": "^1.18.0",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.5",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/multer": "^1.4.12",
    "@types/node": "^20.14.12",
    "prisma": "^5.20.0",
    "tsx": "^4.16.2",
    "typescript": "^5.5.4",
    "vitest": "^2.0.5"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Create web package files**

Use Vue 3 and Vite with proxying `/api` and `/uploads` to the API:

```json
{
  "name": "@bead/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vue-tsc -b && vite build",
    "typecheck": "vue-tsc -b"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^5.1.2",
    "lucide-vue-next": "^0.468.0",
    "vue": "^3.4.38"
  },
  "devDependencies": {
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "vue-tsc": "^2.0.29"
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `pnpm install`

Expected: dependencies install successfully and a lockfile is created.

- [ ] **Step 5: Commit**

Skip commit if the directory is not a git repository. If git exists:

```bash
git add package.json pnpm-workspace.yaml apps/api apps/web
git commit -m "chore: scaffold bead h5 workspace"
```

## Task 2: Data Model And Seed

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/src/db.ts`

- [ ] **Step 1: Write model-focused test**

Create `apps/api/tests/schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Prisma schema", () => {
  it("defines the commercial bead entities", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toContain("model User");
    expect(schema).toContain("model VipPackage");
    expect(schema).toContain("model PaymentOrder");
    expect(schema).toContain("model BeadTask");
    expect(schema).toContain("model AppConfig");
  });
});
```

- [ ] **Step 2: Run test and verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/schema.test.ts`

Expected: FAIL because `prisma/schema.prisma` does not exist.

- [ ] **Step 3: Add Prisma schema**

Define SQLite datasource, Prisma client generator, and models matching the design doc. Include unique constraints for `openid`, package IDs, and `outTradeNo`.

- [ ] **Step 4: Add seed data**

Seed:

- Normal package: 10 times, 4.90 CNY.
- AI package: 5 times, 9.90 CNY.
- Brand palette `MARD` with at least 12 colors.
- Upload config with max length `2097152`.
- Slider config for tolerance, grid size, and color limit.

- [ ] **Step 5: Add Prisma client export**

Create:

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 6: Run schema test and Prisma generate**

Run:

```bash
pnpm --filter @bead/api test apps/api/tests/schema.test.ts
pnpm --filter @bead/api prisma:generate
```

Expected: test passes and Prisma client is generated.

## Task 3: Count Accounting Service

**Files:**
- Create: `apps/api/src/services/counts.ts`
- Create: `apps/api/tests/counts.test.ts`

- [ ] **Step 1: Write failing count tests**

Create tests for these behaviors:

```ts
import { describe, expect, it } from "vitest";
import { applyCredit, deductForTask, refundForTask } from "../src/services/counts";

describe("count accounting", () => {
  it("deducts one regular count for normal tasks", () => {
    const user = { regularCount: 2, memberCount: 5 };
    const result = deductForTask(user, false);
    expect(result.user).toEqual({ regularCount: 1, memberCount: 5 });
    expect(result.deduction).toEqual({ type: "regular", count: 1 });
  });

  it("deducts one ai count for ai tasks", () => {
    const user = { regularCount: 2, memberCount: 5 };
    const result = deductForTask(user, true);
    expect(result.user).toEqual({ regularCount: 2, memberCount: 4 });
    expect(result.deduction).toEqual({ type: "ai", count: 1 });
  });

  it("does not deduct unlimited counts", () => {
    const user = { regularCount: -1, memberCount: -1 };
    expect(deductForTask(user, false).user.regularCount).toBe(-1);
    expect(deductForTask(user, true).user.memberCount).toBe(-1);
  });

  it("throws when no count remains", () => {
    expect(() => deductForTask({ regularCount: 0, memberCount: 1 }, false)).toThrow("NO_REGULAR_COUNT");
    expect(() => deductForTask({ regularCount: 1, memberCount: 0 }, true)).toThrow("NO_AI_COUNT");
  });

  it("refunds the originally deducted count type", () => {
    expect(refundForTask({ regularCount: 0, memberCount: 3 }, "regular", 1)).toEqual({ regularCount: 1, memberCount: 3 });
    expect(refundForTask({ regularCount: 3, memberCount: 0 }, "ai", 1)).toEqual({ regularCount: 3, memberCount: 1 });
  });

  it("credits package counts to the correct bucket", () => {
    expect(applyCredit({ regularCount: 1, memberCount: 2 }, "normal", 10)).toEqual({ regularCount: 11, memberCount: 2 });
    expect(applyCredit({ regularCount: 1, memberCount: 2 }, "ai", 5)).toEqual({ regularCount: 1, memberCount: 7 });
  });
});
```

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/counts.test.ts`

Expected: FAIL because `counts.ts` does not exist.

- [ ] **Step 3: Implement count service**

Create pure functions:

- `deductForTask(user, isAI)`
- `refundForTask(user, type, count)`
- `applyCredit(user, packageType, count)`

Use `-1` as unlimited and never mutate the input object.

- [ ] **Step 4: Verify green**

Run: `pnpm --filter @bead/api test apps/api/tests/counts.test.ts`

Expected: PASS.

## Task 4: Bead Generator

**Files:**
- Create: `apps/api/src/services/beadGenerator.ts`
- Create: `apps/api/tests/beadGenerator.test.ts`

- [ ] **Step 1: Write failing generator tests**

Test pure palette matching first:

```ts
import { describe, expect, it } from "vitest";
import { nearestPaletteColor, limitPalette } from "../src/services/beadGenerator";

describe("bead generator helpers", () => {
  const palette = [
    { name: "black", hex: "#000000" },
    { name: "white", hex: "#ffffff" },
    { name: "red", hex: "#ff0000" }
  ];

  it("finds the nearest color by RGB distance", () => {
    expect(nearestPaletteColor("#f20a08", palette)).toEqual({ name: "red", hex: "#ff0000" });
    expect(nearestPaletteColor("#eeeeee", palette)).toEqual({ name: "white", hex: "#ffffff" });
  });

  it("limits palette size without dropping all colors", () => {
    expect(limitPalette(palette, 2)).toHaveLength(2);
    expect(limitPalette(palette, 99)).toHaveLength(3);
    expect(limitPalette(palette, 0)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/beadGenerator.test.ts`

Expected: FAIL because `beadGenerator.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Implement:

- `hexToRgb(hex)`
- `rgbDistance(a, b)`
- `nearestPaletteColor(hex, palette)`
- `limitPalette(palette, colorLimit)`

- [ ] **Step 4: Verify helper tests green**

Run: `pnpm --filter @bead/api test apps/api/tests/beadGenerator.test.ts`

Expected: PASS.

- [ ] **Step 5: Add image generation test**

Extend the test to create a tiny Sharp image, call `generateBeadImages`, and expect three output files to exist.

- [ ] **Step 6: Verify image test red**

Run the same test command.

Expected: FAIL because `generateBeadImages` is missing.

- [ ] **Step 7: Implement image generation**

Implement `generateBeadImages(inputPath, options)` with Sharp:

- Resize/crop to `gridSize`.
- Read raw pixel data.
- Map each pixel to palette.
- Render an SVG result grid of circles.
- Render a preview SVG with slightly larger cells and thin grid lines.
- Save original normalized PNG, result PNG, and preview PNG.

- [ ] **Step 8: Verify generator green**

Run: `pnpm --filter @bead/api test apps/api/tests/beadGenerator.test.ts`

Expected: PASS.

## Task 5: Express API Skeleton

**Files:**
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/middleware/session.ts`
- Create: `apps/api/tests/app.test.ts`

- [ ] **Step 1: Write failing app test**

Test:

```ts
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

describe("app", () => {
  it("responds to health checks", async () => {
    const app = createApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
```

Add `supertest` and `@types/supertest` to API dev dependencies before running this test.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/app.test.ts`

Expected: FAIL because `createApp` does not exist.

- [ ] **Step 3: Implement app skeleton**

Create an Express app with JSON parsing, cookie parsing, sessions, CORS for development, `/uploads` static serving, and `/api/health`.

- [ ] **Step 4: Verify green**

Run: `pnpm --filter @bead/api test apps/api/tests/app.test.ts`

Expected: PASS.

## Task 6: Config, Customer, VIP, And Mock Auth APIs

**Files:**
- Create: `apps/api/src/routes/config.ts`
- Create: `apps/api/src/routes/customer.ts`
- Create: `apps/api/src/routes/vip.ts`
- Create: `apps/api/src/routes/auth.ts`
- Create: `apps/api/src/services/appConfig.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/tests/basicRoutes.test.ts`

- [ ] **Step 1: Write failing API tests**

Use Supertest to verify:

- `GET /api/app/config/getConfig` returns `uploadData`, `brandList`, `styleList`, `isAI`, `isReversal`, `tolerance`, `gridSize`, `colorLimit`.
- `GET /api/app/customer/getInfo` returns counts.
- `GET /api/app/vip/queryList` returns package array.
- `POST /api/auth/dev-login` creates a session user.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/basicRoutes.test.ts`

Expected: FAIL because routes are missing.

- [ ] **Step 3: Implement routes**

Use Prisma-backed seed data when available; fall back to a deterministic config object for tests. `dev-login` should create or find a user with `openid = "dev-openid"` and initial counts.

- [ ] **Step 4: Verify green**

Run: `pnpm --filter @bead/api test apps/api/tests/basicRoutes.test.ts`

Expected: PASS.

## Task 7: Payment Order Lifecycle

**Files:**
- Create: `apps/api/src/services/payment.ts`
- Create: `apps/api/src/routes/pay.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/tests/payment.test.ts`

- [ ] **Step 1: Write failing payment tests**

Cover:

- Creating a mock payment order returns JSAPI-shaped params.
- Mock notify credits counts.
- Repeating the same notify does not credit twice.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/payment.test.ts`

Expected: FAIL because payment service/routes are missing.

- [ ] **Step 3: Implement payment service**

Implement:

- `createPaymentOrder(userId, vipId)`
- `markOrderPaid(outTradeNo, transactionId)`
- `buildMockJsapiParams(outTradeNo)`

Use database transactions for idempotent count crediting.

- [ ] **Step 4: Add routes**

Routes:

- `POST /api/app/pay/create`
- `POST /api/app/pay/mock-notify`
- `POST /api/app/pay/notify`

For first slice, `/notify` can return a clear `501` unless real WeChat env vars are configured; `/mock-notify` is used for local verification.

- [ ] **Step 5: Verify green**

Run: `pnpm --filter @bead/api test apps/api/tests/payment.test.ts`

Expected: PASS.

## Task 8: Bead Upload, Task Polling, And History

**Files:**
- Create: `apps/api/src/routes/bead.ts`
- Create: `apps/api/src/services/storage.ts`
- Modify: `apps/api/src/app.ts`
- Create: `apps/api/tests/beadRoutes.test.ts`

- [ ] **Step 1: Write failing bead route tests**

Cover:

- Upload without a count returns `402` and code `NO_REGULAR_COUNT`.
- Upload with a count creates a task and deducts count.
- `GET /api/app/bead/getBeadTask` returns generated URLs after processing.
- `GET /api/app/bead/queryBeadLogList` includes the task.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/beadRoutes.test.ts`

Expected: FAIL because route is missing.

- [ ] **Step 3: Implement storage service**

Create `uploads/originals`, `uploads/results`, and safe path helpers:

- `saveUpload(file)`
- `taskOutputDir(taskId)`
- `publicUrl(absPath)`

- [ ] **Step 4: Implement bead route**

Use Multer memory upload, validate file type and size, save upload, deduct count, create task, run generation, and update task. Return `{ msg: taskId }`.

- [ ] **Step 5: Verify green**

Run: `pnpm --filter @bead/api test apps/api/tests/beadRoutes.test.ts`

Expected: PASS.

## Task 9: Web API Client And Types

**Files:**
- Create: `apps/web/src/types.ts`
- Create: `apps/web/src/api.ts`

- [ ] **Step 1: Create typed API client**

Implement functions:

- `devLogin()`
- `getConfig()`
- `getCustomerInfo()`
- `getVipPackages()`
- `uploadBeadTask(formData)`
- `getBeadTask(logId)`
- `getHistory()`
- `createPayment(vipId)`
- `mockNotify(outTradeNo)`

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @bead/web typecheck`

Expected: PASS once Vue app files exist in the next task.

## Task 10: H5 Frontend

**Files:**
- Create: `apps/web/src/main.ts`
- Create: `apps/web/src/App.vue`
- Create: `apps/web/src/styles.css`

- [ ] **Step 1: Implement Vue shell**

Mount `<App />` from `main.ts` and import `styles.css`.

- [ ] **Step 2: Implement H5 UI**

Build:

- Upload card.
- Brand selector.
- Base settings.
- Detail sliders.
- Count display.
- Generate button.
- History drawer.
- Recharge modal.
- Loading overlay.
- Result tabs.

Use local generated visual assets through CSS, icons from `lucide-vue-next`, and no proprietary images from the reference site.

- [ ] **Step 3: Wire API flow**

On mount:

1. Call `devLogin()` in development.
2. Load config, user, packages, and history.

On generate:

1. Build multipart form.
2. Call upload endpoint.
3. Poll `getBeadTask`.
4. Refresh counts and history.

On recharge:

1. Call `createPayment`.
2. In development, call `mockNotify`.
3. Refresh counts.

- [ ] **Step 4: Typecheck and build**

Run:

```bash
pnpm --filter @bead/web typecheck
pnpm --filter @bead/web build
```

Expected: both pass.

## Task 11: Real WeChat Integration Hooks

**Files:**
- Create: `apps/api/src/services/wechatOAuth.ts`
- Create: `apps/api/src/services/wechatPay.ts`
- Modify: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/routes/pay.ts`
- Create: `apps/api/tests/wechatConfig.test.ts`

- [ ] **Step 1: Write failing env behavior tests**

Verify:

- Missing WeChat env keeps mock mode enabled.
- Complete WeChat env marks WeChat pay as configurable.
- `/api/auth/wechat/start` returns `501` in mock mode instead of silently failing.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @bead/api test apps/api/tests/wechatConfig.test.ts`

Expected: FAIL because hooks do not exist.

- [ ] **Step 3: Implement hooks**

Implement OAuth URL construction and WeChat pay parameter signing as isolated functions. Do not call the live WeChat API in tests.

- [ ] **Step 4: Verify green**

Run: `pnpm --filter @bead/api test apps/api/tests/wechatConfig.test.ts`

Expected: PASS.

## Task 12: End-To-End Local Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add README runbook**

Document:

- `pnpm install`
- `pnpm --filter @bead/api prisma:migrate`
- `pnpm --filter @bead/api prisma:seed`
- `pnpm dev`
- API URL and H5 URL.
- Development mock login/payment behavior.
- Required WeChat production env vars.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all pass.

- [ ] **Step 3: Start local servers**

Run: `pnpm dev`

Expected:

- API starts on `http://localhost:4000`.
- H5 starts on `http://localhost:5173`.

- [ ] **Step 4: Browser smoke test**

Open `http://localhost:5173` in the in-app browser with a mobile viewport. Verify:

- Page resembles the commercial reference layout.
- Uploading an image generates result tabs.
- Counts decrease after generation.
- Mock recharge increases counts.
- History shows the task.

## Self-Review Notes

- Spec coverage: product UI, auth, config, counts, packages, payment lifecycle, upload, generation, polling, history, and WeChat hooks are all represented by tasks.
- First slice keeps real WeChat integration behind env-gated hooks and uses mock auth/payment locally, matching the approved H5 commercial plan while allowing development without credentials.
- The plan uses TDD for backend behavior. Frontend implementation is verified by typecheck, build, and browser smoke test because the first UI slice is mostly integration and visual behavior.
