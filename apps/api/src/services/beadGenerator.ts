import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export type PaletteColor = {
  name: string;
  hex: string;
};

export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type ColorUsage = {
  code: string;
  hex: string;
  count: number;
};

export type GenerateOptions = {
  outputDir: string;
  gridSize: number;
  gridWidth?: number;
  gridHeight?: number;
  colorLimit: number | "auto";
  isReversal: boolean;
  tolerance: number;
  palette: PaletteColor[];
};

export type GeneratedImages = {
  originalPath: string;
  resultPath: string;
  previewPath: string;
  width: number;
  height: number;
  totalBeads: number;
  selectedColorCount: number;
  usage: ColorUsage[];
};

export function calculateGridDimensions(sourceWidth: number, sourceHeight: number, longSide: number, exactWidth?: number, exactHeight?: number) {
  if (exactWidth && exactHeight) {
    return { width: exactWidth, height: exactHeight };
  }
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: longSide, height: longSide };
  }

  if (sourceWidth >= sourceHeight) {
    return {
      width: longSide,
      height: Math.max(1, Math.round((sourceHeight / sourceWidth) * longSide))
    };
  }

  return {
    width: Math.max(1, Math.round((sourceWidth / sourceHeight) * longSide)),
    height: longSide
  };
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16)
  };
}

export function rgbToHex(rgb: Rgb): string {
  return `#${[rgb.r, rgb.g, rgb.b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function rgbDistance(a: Rgb, b: Rgb): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

function srgbToLinear(value: number) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function pivotXyz(value: number) {
  return value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116;
}

function rgbToLab(rgb: Rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const fx = pivotXyz(x);
  const fy = pivotXyz(y);
  const fz = pivotXyz(z);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz)
  };
}

function labDistance(a: Rgb, b: Rgb) {
  const labA = rgbToLab(a);
  const labB = rgbToLab(b);
  return (labA.l - labB.l) ** 2 * 1.2 + (labA.a - labB.a) ** 2 + (labA.b - labB.b) ** 2;
}

export function nearestPaletteColor(hex: string, palette: PaletteColor[]): PaletteColor {
  const rgb = hexToRgb(hex);
  return palette.reduce((best, color) => {
    return labDistance(rgb, hexToRgb(color.hex)) < labDistance(rgb, hexToRgb(best.hex)) ? color : best;
  }, palette[0]);
}

export function limitPalette(palette: PaletteColor[], colorLimit: number): PaletteColor[] {
  return palette.slice(0, Math.max(1, Math.min(colorLimit, palette.length)));
}

function normalizeColorLimit(colorLimit: number | "auto", availableColors: number, candidateCount: number) {
  if (colorLimit === "auto") {
    const autoCount = candidateCount > 60 ? 64 : candidateCount > 36 ? 42 : 24;
    return Math.max(1, Math.min(autoCount, availableColors, 96));
  }

  return Math.max(1, Math.min(colorLimit, availableColors));
}

export function selectPaletteForImageColors(
  samples: Rgb[],
  palette: PaletteColor[],
  colorLimit: number | "auto"
): PaletteColor[] {
  if (palette.length === 0) {
    return [];
  }

  const usage = new Map<string, { color: PaletteColor; count: number }>();
  for (const sample of samples) {
    const nearest = nearestPaletteColor(rgbToHex(sample), palette);
    const key = nearest.name;
    const existing = usage.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      usage.set(key, { color: nearest, count: 1 });
    }
  }

  const sorted = [...usage.values()].sort((a, b) => b.count - a.count || a.color.name.localeCompare(b.color.name));
  const resolvedLimit = normalizeColorLimit(colorLimit, palette.length, sorted.length);
  return sorted.slice(0, resolvedLimit).map((item) => item.color);
}

export function summarizeUsage(colors: PaletteColor[]): ColorUsage[] {
  const usage = new Map<string, ColorUsage>();
  for (const color of colors) {
    const code = color.name;
    const existing = usage.get(code);
    if (existing) {
      existing.count += 1;
    } else {
      usage.set(code, { code, hex: color.hex, count: 1 });
    }
  }
  return [...usage.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function readableTextColor(hex: string) {
  const rgb = hexToRgb(hex);
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.58 ? "#202027" : "#ffffff";
}

function maybeReverse(rgb: Rgb, isReversal: boolean): Rgb {
  if (!isReversal) {
    return rgb;
  }

  return { r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b };
}

function applyTolerance(rgb: Rgb, tolerance: number): Rgb {
  if (tolerance <= 0) {
    return rgb;
  }

  const factor = Math.min(0.35, tolerance / 100);
  const push = (value: number) => {
    return Math.round(value < 128 ? value * (1 - factor) : value + (255 - value) * factor);
  };
  return { r: push(rgb.r), g: push(rgb.g), b: push(rgb.b) };
}

async function averageImageColor(inputPath: string) {
  const stats = await sharp(inputPath).rotate().resize(32, 32, { fit: "inside" }).stats();
  const [r, g, b] = stats.channels;
  return {
    r: Math.round(r.mean),
    g: Math.round(g.mean),
    b: Math.round(b.mean),
    alpha: 1
  };
}
function renderResultSvg(colors: PaletteColor[], widthCells: number, heightCells: number, cellSize: number) {
  const width = widthCells * cellSize;
  const height = heightCells * cellSize;
  const circles = colors.map((color, index) => {
    const x = index % widthCells;
    const y = Math.floor(index / widthCells);
    return `<circle cx="${x * cellSize + cellSize / 2}" cy="${y * cellSize + cellSize / 2}" r="${cellSize * 0.42}" fill="${color.hex}" />`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" rx="16" fill="#f8f7ff"/>${circles.join("")}</svg>`;
}

function renderChartSvg(colors: PaletteColor[], widthCells: number, heightCells: number, cellSize: number, usage: ColorUsage[]) {
  const top = 92;
  const left = 28;
  const right = 28;
  const bottomAxis = 24;
  const legendItemWidth = 92;
  const legendRows = Math.max(1, Math.ceil(usage.length / 6));
  const legendHeight = legendRows * 38 + 20;
  const gridWidth = widthCells * cellSize;
  const gridHeight = heightCells * cellSize;
  const svgWidth = left + gridWidth + right;
  const svgHeight = top + gridHeight + bottomAxis + legendHeight;

  const cells = colors.map((color, index) => {
    const x = index % widthCells;
    const y = Math.floor(index / widthCells);
    const label = escapeXml(color.name);
    return `<g><rect x="${left + x * cellSize}" y="${top + y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${color.hex}" stroke="#d7d4dd" stroke-width="0.5"/><text x="${left + x * cellSize + cellSize / 2}" y="${top + y * cellSize + cellSize * 0.63}" text-anchor="middle" font-size="${Math.max(8, cellSize * 0.34)}" font-family="Arial, sans-serif" fill="${readableTextColor(color.hex)}">${label}</text></g>`;
  });

  const topAxis = Array.from({ length: widthCells }, (_, index) => {
    const x = left + index * cellSize + cellSize / 2;
    return `<text x="${x}" y="${top - 8}" text-anchor="middle" font-size="10" font-family="Arial">${index + 1}</text><text x="${x}" y="${top + gridHeight + 14}" text-anchor="middle" font-size="10" font-family="Arial">${index + 1}</text>`;
  });

  const sideAxis = Array.from({ length: heightCells }, (_, index) => {
    const y = top + index * cellSize + cellSize * 0.65;
    return `<text x="${left - 8}" y="${y}" text-anchor="end" font-size="10" font-family="Arial">${index + 1}</text><text x="${left + gridWidth + 8}" y="${y}" font-size="10" font-family="Arial">${index + 1}</text>`;
  });

  const legend = usage.map((item, index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;
    const x = left + col * legendItemWidth;
    const y = top + gridHeight + bottomAxis + 12 + row * 38;
    return `<g><rect x="${x}" y="${y}" width="82" height="26" rx="5" fill="${item.hex}"/><text x="${x + 41}" y="${y + 17}" text-anchor="middle" font-size="11" font-family="Arial" fill="${readableTextColor(item.hex)}">${escapeXml(item.code)} x${item.count}</text></g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}"><rect width="100%" height="100%" fill="#ffffff"/><text x="${left}" y="34" font-size="26" font-family="Arial, sans-serif" font-weight="700" fill="#17151f">MARD  |  ${widthCells * heightCells} pcs</text><text x="${left}" y="58" font-size="15" font-family="Arial, sans-serif" fill="#5d5968">${widthCells} x ${heightCells} bead chart</text>${topAxis.join("")}${sideAxis.join("")}<rect x="${left}" y="${top}" width="${gridWidth}" height="${gridHeight}" fill="none" stroke="#111" stroke-width="1"/>${cells.join("")}${legend.join("")}</svg>`;
}

export async function generateBeadImages(inputPath: string, options: GenerateOptions): Promise<GeneratedImages> {
  await mkdir(options.outputDir, { recursive: true });

  const originalPath = join(options.outputDir, "original.png");
  const resultPath = join(options.outputDir, "result.png");
  const previewPath = join(options.outputDir, "preview.png");
  const metadata = await sharp(inputPath).rotate().metadata();
  const dimensions = calculateGridDimensions(metadata.width ?? options.gridSize, metadata.height ?? options.gridSize, options.gridSize, options.gridWidth, options.gridHeight);

  const normalized = sharp(inputPath)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .png();
  await normalized.toFile(originalPath);

  const raw = await sharp(inputPath)
    .rotate()
    .resize(dimensions.width, dimensions.height, { fit: "contain", background: await averageImageColor(inputPath) })
    .raw()
    .ensureAlpha()
    .toBuffer();

  const samples: Rgb[] = [];
  for (let index = 0; index < raw.length; index += 4) {
    const rgb = applyTolerance(maybeReverse({ r: raw[index], g: raw[index + 1], b: raw[index + 2] }, options.isReversal), options.tolerance);
    samples.push(rgb);
  }

  const palette = selectPaletteForImageColors(samples, options.palette, options.colorLimit);
  const colors = samples.map((rgb) => nearestPaletteColor(rgbToHex(rgb), palette));
  const usage = summarizeUsage(colors);
  await sharp(Buffer.from(renderResultSvg(colors, dimensions.width, dimensions.height, 24))).png().toFile(resultPath);
  await sharp(Buffer.from(renderChartSvg(colors, dimensions.width, dimensions.height, 24, usage))).png().toFile(previewPath);

  return {
    originalPath,
    resultPath,
    previewPath,
    width: dimensions.width,
    height: dimensions.height,
    totalBeads: dimensions.width * dimensions.height,
    selectedColorCount: palette.length,
    usage
  };
}







