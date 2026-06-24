# AI And MARD 221 Color Upgrade Design

## Goal

Upgrade the current bead H5 prototype so generated charts look closer to commercial references:

- Use the real MARD standard palette instead of the temporary 24-color demo palette.
- Select colors intelligently from the full palette for each uploaded image.
- Restore AI mode as a paid enhancement with three user-facing options.
- Use Volcengine Ark as the first AI provider because the supplied key successfully reached chat and image generation endpoints during testing.

This design is a focused quality upgrade. It does not replace the larger commercial roadmap for persistent user management, real WeChat payment, admin tools, or production database deployment.

## Current Problems

The current generator is limited by three issues:

1. The built-in MARD palette only contains a small demo subset, so images lose skin tones, shadow colors, subtle background tones, and accent colors.
2. The generator currently limits against the first `N` colors in the palette instead of choosing the best `N` colors for the image.
3. AI mode is hidden, so the app cannot perform higher-value preprocessing such as background removal, cartoonization, or subject enhancement before bead conversion.

The reference output uses richer color codes and a cleaned/commercialized source image. Matching that quality requires both a real palette and an AI preprocessing stage.

## Scope

### Included

- Add MARD 221 standard color palette as internal application data.
- Keep 291-color extended MARD support out of the first version.
- Replace the current palette truncation logic with image-aware palette selection.
- Update color count choices to support larger professional outputs:
  - `16`
  - `24`
  - `32`
  - `42`
  - `64`
  - `96`
  - `自动`
- Restore the AI toggle in the UI.
- Add AI style choices:
  - `去背景`
  - `卡通化`
  - `去背景 + 卡通化`
- Use `去背景 + 卡通化` as the default AI style.
- Route AI mode through a provider interface.
- Implement Volcengine Ark as the first provider.
- Keep provider secrets in environment variables only.
- Add tests for palette selection and AI provider request construction.

### Excluded

- MARD 291 extended palette.
- Admin palette editor.
- User-facing before/after AI comparison screen.
- Production queue system.
- Real persistence migration.
- Real WeChat payment changes.
- Any secret committed to GitHub.

## Palette Source

The user provided `https://www.pindou.online/colors` as the color-card reference. The page states that MARD standard palette contains 221 color codes and that the full version contains 291 colors.

For this version, the app should import the 221-color standard palette into source code as a static dataset. Runtime scraping is intentionally avoided because it would make generation dependent on a third-party page and page structure.

The palette file should store:

- `code`: bead color code such as `H16`.
- `hex`: color value used by the matching algorithm.
- `series`: derived from the code prefix, such as `H`, `M`, `G`, `F`, `C`.
- `brand`: `MARD`.

If a color name is available later, it can be added as optional metadata without changing generation.

## Palette Selection Algorithm

The current behavior effectively does this:

1. Take the first `colorLimit` colors from the palette.
2. Map every pixel to the nearest color in that subset.

This should be replaced with an image-aware flow:

1. Normalize the uploaded or AI-processed image.
2. Downsample to the target grid dimensions.
3. Sample all pixels that will become beads.
4. Convert sampled colors and MARD palette colors into a perceptual color space.
5. Find candidate MARD colors that best cover the image colors.
6. Choose up to the requested color count.
7. Map every grid cell to the nearest selected MARD color.
8. Summarize usage and render the effect image and printable chart.

The first implementation can use LAB distance plus frequency weighting:

- Common image colors should influence selection more than rare noise.
- Very similar selected palette colors should be discouraged unless they are both heavily used.
- Transparent or near-white background created by AI removal should map cleanly to white or be omitted if the chart format later supports empty cells.

For `自动`, the system should choose a practical count from the image complexity. A first rule can be:

- Simple images: around 24 colors.
- Portraits or detailed images: around 42 colors.
- Highly detailed images: around 64 colors.

The auto count must still cap at 96 in this version.

## AI Modes

AI mode should be a paid preprocessing step before bead conversion. The bead chart generator remains deterministic and local after AI preprocessing.

### 去背景

Purpose: clean or simplify the background while keeping the original subject style.

Prompt direction:

- Preserve the main subject.
- Remove distracting background.
- Use clean white or transparent-looking background.
- Do not change facial identity, object shape, or important details.

### 卡通化

Purpose: convert a photo into a cleaner illustration style that maps better to beads.

Prompt direction:

- Preserve subject identity and pose.
- Simplify texture and lighting.
- Use clear color regions.
- Avoid excessive tiny details.

### 去背景 + 卡通化

Purpose: default commercial mode.

Prompt direction:

- Preserve the subject.
- Remove or simplify background.
- Convert to clean cartoon or soft illustration.
- Keep clear color blocks suitable for bead art.

## AI Provider

The app should add an `aiImageService` interface so provider choice is isolated from the bead generator.

Suggested interface:

```ts
type AiStyle = "remove-background" | "cartoonize" | "remove-background-cartoonize";

type AiImageProvider = {
  optimizeImage(inputPath: string, style: AiStyle, outputDir: string): Promise<{ outputPath: string }>;
};
```

The first provider should use Volcengine Ark:

- Base URL: `https://ark.cn-beijing.volces.com/api/v3`
- Image model: `doubao-seedream-4-0-250828`
- Chat model for future prompt assistance: `doubao-seed-1-6-flash-250615`

Required environment variables:

```env
AI_PROVIDER=volcengine
VOLCENGINE_API_KEY=
VOLCENGINE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
VOLCENGINE_IMAGE_MODEL=doubao-seedream-4-0-250828
VOLCENGINE_CHAT_MODEL=doubao-seed-1-6-flash-250615
```

The existing user-provided keys must be treated as test credentials and should not be committed. Production should use newly issued keys.

## Generation Flow

### Normal Mode

1. User uploads image.
2. Backend deducts one regular count.
3. Backend generates chart using local processing and MARD 221 palette.
4. Backend saves original, effect, and chart images.
5. Frontend displays result.

### AI Mode

1. User uploads image.
2. User enables AI mode and selects one AI style.
3. Backend deducts one AI count.
4. Backend sends the uploaded image through `aiImageService`.
5. Backend uses the AI-optimized output as the input for bead generation.
6. Backend generates chart using local processing and MARD 221 palette.
7. Backend saves original, AI-optimized image, effect, and chart images.
8. Frontend displays result.

If AI preprocessing fails after count deduction, the backend should refund the deducted AI count and return a clear failure message.

## UI Changes

The main H5 should restore AI controls without overwhelming normal users.

- Add `AI 优化` switch in the base settings card.
- When enabled, show a segmented style control:
  - `去背景`
  - `卡通化`
  - `去背景+卡通`
- Change the generate button text:
  - Normal mode: `一键生成图纸`
  - AI mode: `AI 优化并生成`
- Keep count display:
  - `普通次数`
  - `AI次数`
- If AI count is insufficient, open recharge modal.

The result tabs can stay as:

- `原图`
- `效果`
- `图纸`

A later version can add `AI图` as a fourth tab, but this version can keep the UI simpler by using AI output internally.

## API Changes

The existing upload endpoint can stay:

`POST /api/app/bead/upload`

Add or normalize fields:

- `isAI`: boolean string.
- `aiStyle`: one of `remove-background`, `cartoonize`, `remove-background-cartoonize`.
- `colorLimit`: number or `auto`.

Task records should store:

- `aiStyle`
- `aiSourcePath` or `optimizedPath`
- `selectedColorCount`

History responses should include whether the task used AI and the final selected color count.

## Error Handling

- Missing AI provider config: disable AI generation and show `AI 服务暂未配置`.
- AI provider 4xx: mark task failed and refund count.
- AI provider timeout: mark task failed and refund count.
- AI output download failure: mark task failed and refund count.
- Palette dataset missing or malformed: fail startup or fail config tests, not at user generation time.
- Auto color count too high for image size: cap to the smaller of requested count and usable palette/color clusters.

## Tests

### Unit Tests

- MARD 221 palette has exactly 221 entries.
- Palette codes are unique.
- Palette hex values are valid.
- Palette selection returns no more than requested color count.
- Palette selection can choose colors outside the first 30 palette entries.
- Auto color count returns a bounded value.
- AI provider builds the correct request for each AI style.
- AI provider does not log or expose API keys.

### API Tests

- Normal task deducts regular count.
- AI task deducts AI count.
- AI failure refunds AI count.
- Insufficient AI count opens the same 402 path as normal count shortage.
- `colorLimit=auto` is accepted and persisted as final selected count.

### Manual Checks

- Generate a portrait with normal mode and confirm richer colors than the previous 24-color version.
- Generate the same portrait with `去背景+卡通化` and confirm cleaner subject/background separation.
- Confirm the printable chart displays correct MARD codes and usage counts.
- Confirm no key or provider secret appears in browser responses, logs, or Git diff.

## Implementation Order

1. Add MARD 221 palette data file.
2. Add palette validation tests.
3. Replace `limitPalette` with image-aware palette selection.
4. Add `auto` color-limit support.
5. Restore AI UI controls and submit `aiStyle`.
6. Add `aiImageService` interface.
7. Add Volcengine provider.
8. Wire AI preprocessing into `/api/app/bead/upload`.
9. Add AI refund/error tests.
10. Run typecheck, API tests, and build.

