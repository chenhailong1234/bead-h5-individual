import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { calculateGridDimensions, generateBeadImages, imageCellSizeForBoard, limitPalette, nearestPaletteColor, selectPaletteForImageColors, summarizeUsage } from "../src/services/beadGenerator";

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

  it("selects image-aware colors beyond the first palette entries", () => {
    const richPalette = Array.from({ length: 35 }, (_, index) => ({
      name: `C${index + 1}`,
      hex: index === 34 ? "#7f5ac7" : `#${(index + 1).toString(16).padStart(2, "0")}0000`
    }));

    const selected = selectPaletteForImageColors(
      Array.from({ length: 20 }, () => ({ r: 127, g: 90, b: 199 })),
      richPalette,
      1
    );

    expect(selected).toEqual([{ name: "C35", hex: "#7f5ac7" }]);
  });

  it("uses exact board dimensions when they are provided", () => {
    expect(calculateGridDimensions(37, 64, 64, 52, 104)).toEqual({ width: 52, height: 104 });
    expect(calculateGridDimensions(1200, 800, 64, 156, 78)).toEqual({ width: 156, height: 78 });
  });

  it("increases output cell size for larger boards", () => {
    expect(imageCellSizeForBoard(52, 52)).toBe(32);
    expect(imageCellSizeForBoard(104, 104)).toBe(48);
    expect(imageCellSizeForBoard(208, 104)).toBe(48);
  });

  it("keeps edge colors in the selected palette even when light background dominates", () => {
    const weightedPalette = [
      { name: "light", hex: "#f7f7f7" },
      { name: "pink", hex: "#e85c91" },
      { name: "outline", hex: "#2b1b22" }
    ];
    const samples = [
      ...Array.from({ length: 80 }, () => ({ r: 248, g: 248, b: 248 })),
      ...Array.from({ length: 8 }, () => ({ r: 232, g: 92, b: 145 })),
      ...Array.from({ length: 3 }, () => ({ r: 43, g: 27, b: 34 }))
    ];
    const weights = [
      ...Array.from({ length: 80 }, () => 1),
      ...Array.from({ length: 8 }, () => 4),
      ...Array.from({ length: 3 }, () => 18)
    ];

    expect(selectPaletteForImageColors(samples, weightedPalette, 2, weights).map((item) => item.name)).toEqual(["outline", "pink"]);
  });

  it("summarizes color usage by bead code", () => {
    expect(summarizeUsage([
      { name: "H16", hex: "#111111" },
      { name: "H16", hex: "#111111" },
      { name: "M7", hex: "#999999" }
    ])).toEqual([
      { code: "H16", hex: "#111111", count: 2 },
      { code: "M7", hex: "#999999", count: 1 }
    ]);
  });

  it("generates original, result, and preview images", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bead-generator-"));
    const inputPath = join(dir, "input.png");
    await sharp({
      create: {
        width: 4,
        height: 8,
        channels: 3,
        background: "#ff0000"
      }
    }).png().toFile(inputPath);

    const output = await generateBeadImages(inputPath, {
      outputDir: dir,
      gridSize: 8,
      gridWidth: 52,
      gridHeight: 104,
      colorLimit: 2,
      isReversal: false,
      tolerance: 0,
      palette
    });

    expect(existsSync(output.originalPath)).toBe(true);
    expect(existsSync(output.resultPath)).toBe(true);
    expect(existsSync(output.previewPath)).toBe(true);
    expect(output.width).toBe(52);
    expect(output.height).toBe(104);
    expect(output.totalBeads).toBe(5408);
    expect(output.usage.reduce((sum, item) => sum + item.count, 0)).toBe(5408);

    const originalMeta = await sharp(output.originalPath).metadata();
    expect(originalMeta.width).toBe(4);
    expect(originalMeta.height).toBe(8);

    const resultMeta = await sharp(output.resultPath).metadata();
    expect(resultMeta.width).toBe(2496);
    expect(resultMeta.height).toBe(4992);

    const previewMeta = await sharp(output.previewPath).metadata();
    expect(previewMeta.width).toBeGreaterThan(2496);
    expect(previewMeta.height).toBeGreaterThan(4992);
  }, 20_000);
});








