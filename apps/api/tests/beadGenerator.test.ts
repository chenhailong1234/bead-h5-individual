import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { calculateGridDimensions, generateBeadImages, limitPalette, nearestPaletteColor, summarizeUsage } from "../src/services/beadGenerator";

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

  it("uses the requested grid size as the long side and preserves source aspect ratio", () => {
    expect(calculateGridDimensions(37, 64, 64)).toEqual({ width: 37, height: 64 });
    expect(calculateGridDimensions(1200, 800, 64)).toEqual({ width: 64, height: 43 });
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
      colorLimit: 2,
      isReversal: false,
      tolerance: 0,
      palette
    });

    expect(existsSync(output.originalPath)).toBe(true);
    expect(existsSync(output.resultPath)).toBe(true);
    expect(existsSync(output.previewPath)).toBe(true);
    expect(output.width).toBe(4);
    expect(output.height).toBe(8);
    expect(output.totalBeads).toBe(32);
    expect(output.usage.reduce((sum, item) => sum + item.count, 0)).toBe(32);

    const originalMeta = await sharp(output.originalPath).metadata();
    expect(originalMeta.width).toBe(4);
    expect(originalMeta.height).toBe(8);

    const resultMeta = await sharp(output.resultPath).metadata();
    expect(resultMeta.width).toBe(96);
    expect(resultMeta.height).toBe(192);

    const previewMeta = await sharp(output.previewPath).metadata();
    expect(previewMeta.width).toBeGreaterThan(96);
    expect(previewMeta.height).toBeGreaterThan(192);
  });
});

