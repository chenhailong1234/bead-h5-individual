# AI Color Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MARD 221 color support, image-aware palette selection, and paid AI preprocessing through Volcengine Ark.

**Architecture:** Keep bead rendering local and deterministic. Add a static palette module, a palette-selection module, and an AI provider interface used only before local generation when AI mode is enabled.

**Tech Stack:** Vue 3, Vite, Express, TypeScript, Sharp, Vitest, Volcengine Ark OpenAI-compatible API.

---

### Task 1: MARD 221 Palette Data

**Files:**
- Create: `apps/api/src/data/mard221.ts`
- Modify: `apps/api/src/store.ts`
- Test: `apps/api/tests/palette.test.ts`

- [ ] Scrape `https://www.pindou.online/colors` for 221 `code + hex` pairs.
- [ ] Create `mard221.ts` exporting `mard221Palette`.
- [ ] Replace the temporary palette in `store.ts`.
- [ ] Add tests that assert exactly 221 colors, unique codes, valid hex values, and known colors such as `A12`, `H16`, and `M15`.

### Task 2: Image-Aware Palette Selection

**Files:**
- Modify: `apps/api/src/services/beadGenerator.ts`
- Test: `apps/api/tests/beadGenerator.test.ts`

- [ ] Replace `limitPalette` truncation with `selectPaletteForImage`.
- [ ] Weight candidate colors by pixel frequency.
- [ ] Cap selected colors to the requested limit.
- [ ] Add support for `colorLimit = "auto"` internally, capped at 96.
- [ ] Test that selected palettes can include colors beyond the first 30 entries.

### Task 3: AI Config And Types

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/src/store.ts`
- Modify: `apps/web/src/types.ts`
- Modify: `apps/api/src/routes/bead.ts`

- [ ] Add AI environment variables.
- [ ] Add `aiStyle` and `optimizedPath` to task records.
- [ ] Accept `aiStyle` and `colorLimit=auto` from upload requests.
- [ ] Keep secrets out of responses and logs.

### Task 4: Volcengine AI Provider

**Files:**
- Create: `apps/api/src/services/aiImage.ts`
- Test: `apps/api/tests/aiImage.test.ts`

- [ ] Create provider interface.
- [ ] Implement Volcengine image generation request.
- [ ] Download returned image URL into the task output directory.
- [ ] Return a clear `AI_NOT_CONFIGURED` error when env is missing.
- [ ] Test request body construction and missing-config behavior without real network calls.

### Task 5: Wire AI Into Generation

**Files:**
- Modify: `apps/api/src/routes/bead.ts`
- Modify: `apps/api/tests/beadRoutes.test.ts`

- [ ] If `isAI=true`, call `optimizeImage` before `generateBeadImages`.
- [ ] Use optimized image as generation input.
- [ ] Save optimized image path on the task.
- [ ] Refund AI count on AI failures.
- [ ] Add API tests for AI success and AI failure refund.

### Task 6: Restore AI UI

**Files:**
- Modify: `apps/web/src/App.vue`
- Modify: `apps/web/src/styles.css`
- Modify: `apps/web/src/types.ts`

- [ ] Restore visible AI switch.
- [ ] Show AI style segmented controls when enabled.
- [ ] Submit `aiStyle`.
- [ ] Change generate button text in AI mode.
- [ ] Add `自动` color option while preserving mobile layout.

### Task 7: Verify And Commit

**Files:**
- All changed files.

- [ ] Run `pnpm.cmd --filter @bead/api test`.
- [ ] Run `pnpm.cmd --filter @bead/web typecheck`.
- [ ] Run `pnpm.cmd build`.
- [ ] Review `git diff` to ensure no API keys are committed.
- [ ] Commit implementation.

