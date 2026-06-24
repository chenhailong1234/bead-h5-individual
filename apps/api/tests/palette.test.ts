import { describe, expect, it } from "vitest";
import { mard221Palette } from "../src/data/mard221";

describe("MARD 221 palette", () => {
  it("contains the standard 221 colors with unique codes", () => {
    const codes = mard221Palette.map((color) => color.code);
    expect(mard221Palette).toHaveLength(221);
    expect(new Set(codes).size).toBe(221);
  });

  it("stores valid uppercase hex values", () => {
    for (const color of mard221Palette) {
      expect(color.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(color.name).toBe(color.code);
      expect(color.series).toMatch(/^[A-M]$/);
    }
  });

  it("includes common reference colors", () => {
    expect(mard221Palette.find((color) => color.code === "A12")?.hex).toBe("#FE9F72");
    expect(mard221Palette.find((color) => color.code === "H16")?.hex).toBe("#1D1414");
    expect(mard221Palette.find((color) => color.code === "M15")?.hex).toBe("#757D78");
  });
});

