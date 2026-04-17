// Client-side gallery splitter (spinstr98).
//
// Splits a single cropped image into multiple tile crops by detecting
// horizontal + vertical "gutters" — rows/columns of near-uniform color that
// typically sit between gallery photos.
//
// Works entirely on Canvas — no server round-trip, no AI model, no hallucination.
// This is a pragmatic fallback for when Vision returned a single cluster
// region that visibly contains multiple distinct photos.

export interface SplitTile {
  dataUrl: string;
  x: number;        // pixel offset in source
  y: number;
  w: number;
  h: number;
}

export interface SplitOptions {
  /** Minimum width/height a resulting tile must have (px). Default 120. */
  minTileDim?: number;
  /** Minimum gutter thickness as fraction of source dim. Default 0.01. */
  minGutterRatio?: number;
  /** Gutter luma threshold (0-255). Rows above this mean-luma are candidates. Default 210. */
  brightThreshold?: number;
  /** Gutter uniformity threshold (max stddev of luma). Default 14. */
  uniformThreshold?: number;
  /** Min spacing between gutter centers as fraction of source dim. Default 0.08. */
  minSeparationRatio?: number;
  /** JPEG quality. Default 0.9. */
  jpegQuality?: number;
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}

interface RowCol {
  mean: number;     // mean luma
  stddev: number;   // luma stddev
}

/**
 * Compute per-row luma stats. Downsamples to a 1-D scan — we don't need
 * every pixel, just the row profile.
 */
function computeRowStats(data: ImageData): RowCol[] {
  const { data: px, width: w, height: h } = data;
  const out: RowCol[] = new Array(h);
  for (let y = 0; y < h; y += 1) {
    let sum = 0;
    const offsetStart = y * w * 4;
    for (let x = 0; x < w; x += 1) {
      const i = offsetStart + x * 4;
      sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    }
    const mean = sum / w;
    let variance = 0;
    for (let x = 0; x < w; x += 1) {
      const i = offsetStart + x * 4;
      const y_ = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      variance += (y_ - mean) ** 2;
    }
    out[y] = { mean, stddev: Math.sqrt(variance / w) };
  }
  return out;
}

function computeColStats(data: ImageData): RowCol[] {
  const { data: px, width: w, height: h } = data;
  const out: RowCol[] = new Array(w);
  for (let x = 0; x < w; x += 1) {
    let sum = 0;
    for (let y = 0; y < h; y += 1) {
      const i = (y * w + x) * 4;
      sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    }
    const mean = sum / h;
    let variance = 0;
    for (let y = 0; y < h; y += 1) {
      const i = (y * w + x) * 4;
      const y_ = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      variance += (y_ - mean) ** 2;
    }
    out[x] = { mean, stddev: Math.sqrt(variance / h) };
  }
  return out;
}

/**
 * A line index is "gutter-like" if it's very uniform AND either very bright
 * (white gutter) or very dark (black bar). We accept uniform-bright and
 * uniform-dark as valid gutters.
 */
function isGutterLine(stat: RowCol, opts: Required<SplitOptions>): boolean {
  if (stat.stddev > opts.uniformThreshold) return false;
  // Accept bright gutters (typical white/grey page background)
  if (stat.mean >= opts.brightThreshold) return true;
  // Accept dark gutters (common on dark-themed listing pages)
  if (stat.mean <= 255 - opts.brightThreshold) return true;
  return false;
}

/**
 * Find runs of gutter lines and return their center positions, filtering
 * runs that are too thin and positions that are too close together.
 */
function findGutterCenters(
  stats: RowCol[],
  totalDim: number,
  opts: Required<SplitOptions>,
): number[] {
  const minThickness = Math.max(1, Math.round(totalDim * opts.minGutterRatio));
  const minSeparation = Math.max(1, Math.round(totalDim * opts.minSeparationRatio));

  const runs: Array<{ start: number; end: number }> = [];
  let inRun = false;
  let runStart = 0;
  for (let i = 0; i < stats.length; i += 1) {
    const hit = isGutterLine(stats[i], opts);
    if (hit && !inRun) {
      inRun = true;
      runStart = i;
    } else if (!hit && inRun) {
      inRun = false;
      if (i - runStart >= minThickness) runs.push({ start: runStart, end: i - 1 });
    }
  }
  if (inRun && stats.length - runStart >= minThickness) {
    runs.push({ start: runStart, end: stats.length - 1 });
  }

  // Convert runs into centers, skipping runs that sit at the extreme edges
  // (those are just the image boundary, not internal gutters)
  const edgeMargin = totalDim * 0.02;
  const centers = runs
    .filter((r) => r.start > edgeMargin && r.end < totalDim - edgeMargin)
    .map((r) => Math.round((r.start + r.end) / 2));

  // Enforce minimum separation — keep the first of any cluster
  const filtered: number[] = [];
  for (const c of centers) {
    if (filtered.length === 0 || c - filtered[filtered.length - 1] >= minSeparation) {
      filtered.push(c);
    }
  }
  return filtered;
}

/**
 * Split an image by internal gutters into child tiles. Returns [] when no
 * plausible split is found so the caller can fall back to the parent.
 */
export async function splitIntoTiles(
  dataUrl: string,
  options: SplitOptions = {},
): Promise<SplitTile[]> {
  const opts: Required<SplitOptions> = {
    minTileDim: options.minTileDim ?? 120,
    minGutterRatio: options.minGutterRatio ?? 0.01,
    brightThreshold: options.brightThreshold ?? 210,
    uniformThreshold: options.uniformThreshold ?? 14,
    minSeparationRatio: options.minSeparationRatio ?? 0.08,
    jpegQuality: options.jpegQuality ?? 0.9,
  };

  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (srcW < 200 || srcH < 200) return [];

  // Downsample for speed — 600px max dim is plenty for gutter detection
  const scale = Math.min(1, 600 / Math.max(srcW, srcH));
  const analyzeW = Math.max(1, Math.round(srcW * scale));
  const analyzeH = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = analyzeW;
  canvas.height = analyzeH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, analyzeW, analyzeH);
  const imgData = ctx.getImageData(0, 0, analyzeW, analyzeH);

  const rowStats = computeRowStats(imgData);
  const colStats = computeColStats(imgData);

  const rowGuttersAnalyze = findGutterCenters(rowStats, analyzeH, opts);
  const colGuttersAnalyze = findGutterCenters(colStats, analyzeW, opts);

  // Bail out if no plausible gutters found
  if (rowGuttersAnalyze.length === 0 && colGuttersAnalyze.length === 0) return [];

  // Scale gutter positions back to source coordinates
  const toSrcY = (a: number) => Math.round((a / analyzeH) * srcH);
  const toSrcX = (a: number) => Math.round((a / analyzeW) * srcW);
  const rowCuts = [0, ...rowGuttersAnalyze.map(toSrcY), srcH];
  const colCuts = [0, ...colGuttersAnalyze.map(toSrcX), srcW];

  // Build tile rectangles from all (col × row) pairs
  const tiles: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let ri = 0; ri < rowCuts.length - 1; ri += 1) {
    for (let ci = 0; ci < colCuts.length - 1; ci += 1) {
      const x = colCuts[ci];
      const y = rowCuts[ri];
      const w = colCuts[ci + 1] - x;
      const h = rowCuts[ri + 1] - y;
      if (w < opts.minTileDim || h < opts.minTileDim) continue;
      tiles.push({ x, y, w, h });
    }
  }

  // Refuse to split into just 1 tile — that means we found no useful split
  if (tiles.length < 2) return [];

  // Now crop each tile on a full-res canvas
  const fullCanvas = document.createElement('canvas');
  fullCanvas.width = srcW;
  fullCanvas.height = srcH;
  const fullCtx = fullCanvas.getContext('2d');
  if (!fullCtx) return [];
  fullCtx.drawImage(img, 0, 0, srcW, srcH);

  const result: SplitTile[] = [];
  for (const t of tiles) {
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = t.w;
    tileCanvas.height = t.h;
    const tileCtx = tileCanvas.getContext('2d');
    if (!tileCtx) continue;
    tileCtx.drawImage(fullCanvas, t.x, t.y, t.w, t.h, 0, 0, t.w, t.h);
    result.push({
      dataUrl: tileCanvas.toDataURL('image/jpeg', opts.jpegQuality),
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h,
    });
  }

  return result;
}
