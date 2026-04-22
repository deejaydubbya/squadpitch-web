// Client-side image-type classifier (spinstr113).
//
// Purpose: the enhancement pipeline needs to branch on image type —
// property photos, floor plans, and maps should NOT be processed the
// same way. Screenshot-derived floor plans in particular were being
// blurred/smeared by the photo pipeline.
//
// This runs entirely in the browser on a downsampled copy for speed.
// It's a cheap heuristic — confident wins (strong floor-plan signals,
// strong photo signals) return the typed result; otherwise it returns
// 'unknown' and the caller can fall back to a safe default.
//
// Tuned to be conservative: we only call it a floor plan when multiple
// signals agree. False positives (photo misread as floor plan) would
// skip enhancement on real photos, which is worse than defaulting to
// 'property_photo'.

export type ClassifiedImageType = 'property_photo' | 'floorplan' | 'map' | 'unknown';

export interface ClassifyResult {
  type: ClassifiedImageType;
  confidence: number; // 0-1
  signals: {
    whiteRatio: number;          // fraction of pixels that are near-white (luma ≥ 235, low saturation)
    saturationMean: number;      // 0-1 average saturation
    straightEdgeRatio: number;   // fraction of strong edges that are strictly H or V
    blackLineRatio: number;      // fraction of pixels that are near-black with neighboring near-white
    colorClusterCount: number;   // rough color palette size (coarse bucket)
  };
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('classifier image load failed'));
    img.src = src;
  });
}

function sampleImageData(img: HTMLImageElement, maxDim = 256): ImageData {
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

function rgbToHsv(r: number, g: number, b: number): { s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v };
}

export async function classifyImageType(dataUrl: string): Promise<ClassifyResult> {
  const img = await loadImage(dataUrl);
  const data = sampleImageData(img);
  const { width: w, height: h } = data;
  const px = data.data;

  // Pass 1: per-pixel stats (luma, saturation, near-white ratio).
  let whiteCount = 0;
  let blackCount = 0;
  let satSum = 0;
  let pxCount = 0;
  const luma = new Uint8Array(w * h);
  // Coarse color buckets: reduce RGB to 4x4x4 cube → 64 buckets.
  const buckets = new Uint8Array(64);
  for (let i = 0, j = 0; i < px.length; i += 4, j += 1) {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const y = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    luma[j] = y;
    const { s } = rgbToHsv(r, g, b);
    satSum += s;
    pxCount += 1;
    if (y >= 235 && s < 0.08) whiteCount += 1;
    if (y <= 50) blackCount += 1;
    const rb = (r >> 6) & 0x3;
    const gb = (g >> 6) & 0x3;
    const bb = (b >> 6) & 0x3;
    buckets[(rb << 4) | (gb << 2) | bb] = 1;
  }
  const whiteRatio = whiteCount / pxCount;
  const blackRatio = blackCount / pxCount;
  const saturationMean = satSum / pxCount;
  let colorClusterCount = 0;
  for (let k = 0; k < buckets.length; k += 1) colorClusterCount += buckets[k];

  // Pass 2: edge orientation — how many strong edges are strictly
  // horizontal or vertical? Floor plans have overwhelming H/V edges.
  let strongEdges = 0;
  let strictHV = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const dx = luma[i + 1] - luma[i - 1];
      const dy = luma[i + w] - luma[i - w];
      const mag = Math.abs(dx) + Math.abs(dy);
      if (mag < 40) continue;
      strongEdges += 1;
      // strict H = |dx| dominates, |dy| tiny. Strict V = the reverse.
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      if ((adx > 25 && ady < 10) || (ady > 25 && adx < 10)) strictHV += 1;
    }
  }
  const straightEdgeRatio = strongEdges > 0 ? strictHV / strongEdges : 0;

  // "Black line on white" proxy — count near-black pixels adjacent to
  // near-white neighbors. Strong floor-plan signal.
  let blackLineMatches = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      if (luma[i] > 60) continue;
      let whiteNb = 0;
      if (luma[i - 1] > 230) whiteNb += 1;
      if (luma[i + 1] > 230) whiteNb += 1;
      if (luma[i - w] > 230) whiteNb += 1;
      if (luma[i + w] > 230) whiteNb += 1;
      if (whiteNb >= 2) blackLineMatches += 1;
    }
  }
  const blackLineRatio = blackLineMatches / pxCount;

  const signals = {
    whiteRatio,
    saturationMean,
    straightEdgeRatio,
    blackLineRatio,
    colorClusterCount,
  };

  // Decision rules. Conservative — we only fire floor plan when multiple
  // signals agree, otherwise default to property_photo.

  // Floor plan: lots of near-white background, low saturation, H/V edge
  // dominance, and black-line-on-white pixels above threshold.
  const floorplanScore =
    (whiteRatio >= 0.45 ? 1 : whiteRatio >= 0.35 ? 0.5 : 0) +
    (saturationMean < 0.08 ? 1 : saturationMean < 0.15 ? 0.5 : 0) +
    (straightEdgeRatio >= 0.45 ? 1 : straightEdgeRatio >= 0.30 ? 0.5 : 0) +
    (blackLineRatio >= 0.005 ? 1 : 0);
  if (floorplanScore >= 3) {
    return { type: 'floorplan', confidence: Math.min(1, floorplanScore / 4), signals };
  }

  // Map: moderate saturation, many color clusters (>30), low whiteRatio,
  // lower straight-edge dominance than a floorplan. Hard to call reliably
  // so we only return 'map' when it's obvious: many clusters + moderate
  // saturation + NOT a floor plan.
  if (
    colorClusterCount >= 30 &&
    saturationMean > 0.2 &&
    whiteRatio < 0.2 &&
    straightEdgeRatio < 0.35
  ) {
    return { type: 'map', confidence: 0.5, signals };
  }

  // Photo: high color variety + decent saturation + low white ratio.
  const photoScore =
    (colorClusterCount >= 15 ? 1 : 0.5) +
    (saturationMean >= 0.15 ? 1 : 0) +
    (whiteRatio < 0.3 ? 1 : 0) +
    (blackRatio < 0.3 ? 1 : 0);
  if (photoScore >= 3) {
    return { type: 'property_photo', confidence: Math.min(1, photoScore / 4), signals };
  }

  return { type: 'unknown', confidence: 0.3, signals };
}
