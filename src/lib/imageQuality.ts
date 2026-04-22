// Client-side image quality scoring + safe Canvas-based enhancement.
// Used by the Listing Campaign screenshot-import flow (spinstr97).
//
// Philosophy: "restoration, not fabrication."
// Enhancement is limited to sharpening, brightness/contrast, and gentle
// upscaling — no AI model is ever called here, so the property cannot be
// hallucinated.

export type QualityLabel = 'good' | 'fair' | 'low';

export interface QualityResult {
  score: number;            // 0-100
  label: QualityLabel;
  signals: {
    resolution: number;     // 0-100
    brightness: number;     // 0-100
    contrast: number;       // 0-100
    sharpness: number;      // 0-100
  };
  width: number;
  height: number;
}

const RESOLUTION_BASELINE = 1_000_000; // 1MP ≈ 1000×1000

// ── Quality scoring ─────────────────────────────────────────────────────

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
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

function computeLumaStats(data: ImageData): { mean: number; stddev: number; luma: Float32Array } {
  const { data: px, width, height } = data;
  const luma = new Float32Array(width * height);
  let sum = 0;
  for (let i = 0, j = 0; i < px.length; i += 4, j += 1) {
    // Rec. 709 luma
    const y = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    luma[j] = y;
    sum += y;
  }
  const mean = sum / luma.length;
  let variance = 0;
  for (let j = 0; j < luma.length; j += 1) {
    const d = luma[j] - mean;
    variance += d * d;
  }
  variance /= luma.length;
  return { mean, stddev: Math.sqrt(variance), luma };
}

/**
 * Laplacian variance — a simple proxy for sharpness. Higher = sharper.
 * Blurry images produce a tight band of edge responses; sharp images have
 * a wide distribution.
 */
function laplacianVariance(luma: Float32Array, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;
  const out = new Float32Array(w * h);
  let sum = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      // 4-neighbor Laplacian: -4*c + n + s + e + w
      const v =
        -4 * luma[i] +
        luma[i - 1] +
        luma[i + 1] +
        luma[i - w] +
        luma[i + w];
      out[i] = v;
      sum += v;
      count += 1;
    }
  }
  const mean = sum / count;
  let variance = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const d = out[y * w + x] - mean;
      variance += d * d;
    }
  }
  return variance / count;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function toPct(n: number): number {
  return Math.round(clamp01(n) * 100);
}

export async function computeImageQuality(dataUrl: string): Promise<QualityResult> {
  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // Resolution: 0 at <300×300, 100 at ≥1MP
  const pixels = w * h;
  const resolution = clamp01(pixels / RESOLUTION_BASELINE);

  // Sample a small version for per-pixel stats (fast + consistent)
  const sample = sampleImageData(img);
  const { mean, stddev, luma } = computeLumaStats(sample);

  // Brightness: peak at ~120/255, penalize extremes
  const brightnessCenter = 120;
  const brightnessSpan = 90; // tolerate 30-210
  const brightness = 1 - Math.min(1, Math.abs(mean - brightnessCenter) / brightnessSpan);

  // Contrast: stddev of luma. 30+ is typical; 60+ is strong.
  const contrast = clamp01(stddev / 60);

  // Sharpness: Laplacian variance. Calibrated empirically:
  //   < 50  → very blurry
  //   200+  → sharp
  const lap = laplacianVariance(luma, sample.width, sample.height);
  const sharpness = clamp01(lap / 200);

  // Weighted composite — sharpness matters most for usability
  const score = Math.round(
    (resolution * 0.20 +
      brightness * 0.20 +
      contrast * 0.20 +
      sharpness * 0.40) *
      100,
  );

  const label: QualityLabel = score >= 70 ? 'good' : score >= 40 ? 'fair' : 'low';

  return {
    score,
    label,
    signals: {
      resolution: toPct(resolution),
      brightness: toPct(brightness),
      contrast: toPct(contrast),
      sharpness: toPct(sharpness),
    },
    width: w,
    height: h,
  };
}

// ── Safe Canvas-based enhancement ───────────────────────────────────────

/**
 * Image-type hint for enhancement branching (spinstr113). Enhancement
 * used to run one generic pipeline on everything, which over-smoothed
 * photos and destroyed floor-plan line detail. The pipeline now branches:
 *   - property_photo → mild upscale + mild denoise + mild levels + mild sharpen
 *   - floorplan      → contrast/gamma only; no denoise, no sharpen, no upscale
 *   - map/ui/ad/non-photo → skip enhancement (return original)
 *   - unknown        → very mild levels only
 */
export type EnhanceImageType =
  | 'property_photo'
  | 'floorplan'
  | 'map'
  | 'ui'
  | 'ad'
  | 'non_photo'
  | 'unknown';

export interface EnhanceOptions {
  /** Image-type hint. If omitted, caller should classify first. Defaults 'property_photo'. */
  type?: EnhanceImageType;
  /** Max upscale factor — never exceed to avoid artifacts. Default 2. */
  maxUpscale?: number;
  /** Target min dimension after upscale. Default 1000. */
  targetMinDim?: number;
  /** Sharpen amount 0-1. Default 0.15 (reduced further in spinstr113). */
  sharpenAmount?: number;
  /** Auto-level intensity 0-1. Default 0.4 (reduced in spinstr113). */
  levelsAmount?: number;
  /** Denoise amount 0-1 (edge-preserving). Default 0.2 (reduced in spinstr113). */
  denoiseAmount?: number;
  /** Skip enhancement entirely if input already scores 'good' quality. Default true. */
  skipIfGood?: boolean;
}

export interface EnhanceApplied {
  upscaled: boolean;
  denoised: boolean;
  levels: boolean;
  sharpen: boolean;
  /** Floor-plan-only gamma pull toward white background. */
  gamma: boolean;
}

export interface EnhanceResult {
  dataUrl: string;
  applied: EnhanceApplied;
  type: EnhanceImageType;
  /** Non-null when enhancement was deliberately skipped (original returned). */
  skippedReason: string | null;
  width: number;
  height: number;
}

const NO_OP: EnhanceApplied = {
  upscaled: false,
  denoised: false,
  levels: false,
  sharpen: false,
  gamma: false,
};

/**
 * Produce a safely-enhanced variant of a screenshot-derived image.
 * Branches by image type (spinstr113). Operations are strictly
 * restorative and intentionally conservative — a small real improvement
 * is always preferred over a dramatic fake-looking result.
 */
export async function enhanceImageDetailed(
  dataUrl: string,
  opts: EnhanceOptions = {},
): Promise<EnhanceResult> {
  const {
    type = 'property_photo',
    maxUpscale = 2,
    targetMinDim = 1000,
    sharpenAmount = 0.15,
    levelsAmount = 0.4,
    denoiseAmount = 0.2,
    skipIfGood = true,
  } = opts;

  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Non-photo types (maps, ads, UI): skip enhancement entirely.
  if (type === 'map' || type === 'ui' || type === 'ad' || type === 'non_photo') {
    return {
      dataUrl,
      applied: { ...NO_OP },
      type,
      skippedReason: `not a photo (${type})`,
      width: srcW,
      height: srcH,
    };
  }

  // Floor plan: separate pipeline — no denoise, no sharpen, no upscale.
  if (type === 'floorplan') {
    return await enhanceFloorplan(img, srcW, srcH, levelsAmount);
  }

  // Skip-if-already-good short circuit (photo + unknown).
  if (skipIfGood) {
    try {
      const q = await computeImageQuality(dataUrl);
      const alreadyBigEnough = Math.min(srcW, srcH) >= targetMinDim;
      if (q.label === 'good' && alreadyBigEnough) {
        return {
          dataUrl,
          applied: { ...NO_OP },
          type,
          skippedReason: 'already good quality',
          width: srcW,
          height: srcH,
        };
      }
    } catch {
      // Quality check is best-effort — fall through to enhance.
    }
  }

  // Unknown type: extra-cautious — levels only.
  if (type === 'unknown') {
    return await enhanceUnknown(img, srcW, srcH, levelsAmount);
  }

  // Property-photo pipeline.
  const minDim = Math.min(srcW, srcH);
  const upscaleNeeded = minDim < targetMinDim;
  const scale = upscaleNeeded
    ? Math.min(maxUpscale, Math.max(1, targetMinDim / Math.max(1, minDim)))
    : 1;
  const outW = Math.round(srcW * scale);
  const outH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, outW, outH);

  let imgData = ctx.getImageData(0, 0, outW, outH);
  const applied: EnhanceApplied = { ...NO_OP, upscaled: scale > 1 };

  if (denoiseAmount > 0) {
    imgData = applyEdgePreservingDenoise(imgData, denoiseAmount);
    applied.denoised = true;
  }
  if (levelsAmount > 0) {
    applyAutoLevels(imgData, levelsAmount);
    applied.levels = true;
  }
  if (sharpenAmount > 0) {
    imgData = applyUnsharpMask(imgData, sharpenAmount);
    applied.sharpen = true;
  }

  ctx.putImageData(imgData, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    applied,
    type,
    skippedReason: null,
    width: outW,
    height: outH,
  };
}

/**
 * Floor-plan-specific enhancement (spinstr113). Preserves thin black
 * lines on white paper. Deliberately avoids denoise (smears lines),
 * unsharp (amplifies JPEG halos), and upscale (enlarges halos).
 *
 * Pipeline:
 *   1. No upscale — canvas upscaling would just inflate JPEG artifacts.
 *   2. Tight levels stretch (forces near-whites to pure white, near-
 *      blacks to pure black). Mids untouched.
 *   3. Mild gamma pull so page background reads whiter.
 */
async function enhanceFloorplan(
  img: HTMLImageElement,
  srcW: number,
  srcH: number,
  levelsAmount: number,
): Promise<EnhanceResult> {
  const canvas = document.createElement('canvas');
  canvas.width = srcW;
  canvas.height = srcH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, srcW, srcH);

  const imgData = ctx.getImageData(0, 0, srcW, srcH);
  const applied: EnhanceApplied = { ...NO_OP };

  // Tight black/white clamp: anything ≥235 → pure white, ≤30 → pure
  // black, mids re-interpolated. Strength dialed in with levelsAmount.
  const amount = Math.min(1, Math.max(0, levelsAmount));
  if (amount > 0) {
    applyBlackWhiteClamp(imgData, amount);
    applied.levels = true;
    applied.gamma = true;
  }

  ctx.putImageData(imgData, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    applied,
    type: 'floorplan',
    skippedReason: null,
    width: srcW,
    height: srcH,
  };
}

async function enhanceUnknown(
  img: HTMLImageElement,
  srcW: number,
  srcH: number,
  levelsAmount: number,
): Promise<EnhanceResult> {
  // Very conservative: levels only, low strength.
  const canvas = document.createElement('canvas');
  canvas.width = srcW;
  canvas.height = srcH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, srcW, srcH);
  const imgData = ctx.getImageData(0, 0, srcW, srcH);
  const applied: EnhanceApplied = { ...NO_OP };
  const strength = Math.min(levelsAmount, 0.3);
  if (strength > 0) {
    applyAutoLevels(imgData, strength);
    applied.levels = true;
  }
  ctx.putImageData(imgData, 0, 0);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    applied,
    type: 'unknown',
    skippedReason: null,
    width: srcW,
    height: srcH,
  };
}

/**
 * Backward-compatible wrapper returning just the data URL.
 */
export async function enhanceImage(
  dataUrl: string,
  opts: EnhanceOptions = {},
): Promise<string> {
  const r = await enhanceImageDetailed(dataUrl, opts);
  return r.dataUrl;
}

/**
 * Floor-plan levels: clamp whites to pure white and blacks to pure
 * black, with mid-tones re-interpolated. `amount` blends with the
 * original so we don't hard-posterize.
 */
function applyBlackWhiteClamp(data: ImageData, amount: number): void {
  const px = data.data;
  const WHITE_THR = 235;
  const BLACK_THR = 30;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i += 1) {
    let target: number;
    if (i >= WHITE_THR) target = 255;
    else if (i <= BLACK_THR) target = 0;
    else target = Math.round(((i - BLACK_THR) / (WHITE_THR - BLACK_THR)) * 255);
    lut[i] = Math.round(i + (target - i) * amount);
  }
  for (let i = 0; i < px.length; i += 4) {
    px[i] = lut[px[i]];
    px[i + 1] = lut[px[i + 1]];
    px[i + 2] = lut[px[i + 2]];
  }
}

/**
 * Edge-preserving denoise (spinstr112): applies a 3×3 mean blur only on
 * pixels whose local variance is low. Flat regions (walls, skies) get
 * smoothed; edges and text stay crisp.
 *
 * `amount` in [0,1] is the blend weight — 1 = full blur in flat regions.
 */
function applyEdgePreservingDenoise(data: ImageData, amount: number): ImageData {
  if (amount <= 0) return data;
  const { width: w, height: h } = data;
  const src = data.data;
  const out = new ImageData(w, h);
  const dst = out.data;
  dst.set(src);
  // Tightened in spinstr113 (200 → 80): the previous threshold was blurring
  // subtle texture (wood grain, fabric). Only genuinely flat regions qualify.
  const VARIANCE_THR = 80;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = (y * w + x) * 4;
      // Compute local luma variance over 3×3 neighborhood.
      let lSum = 0;
      let lSumSq = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const k = ((y + dy) * w + (x + dx)) * 4;
          const ll = 0.2126 * src[k] + 0.7152 * src[k + 1] + 0.0722 * src[k + 2];
          lSum += ll;
          lSumSq += ll * ll;
        }
      }
      const lMean = lSum / 9;
      const lVar = Math.max(0, lSumSq / 9 - lMean * lMean);
      if (lVar > VARIANCE_THR) continue; // edge — leave untouched

      // Box blur the 3 channels
      for (let c = 0; c < 3; c += 1) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            sum += src[((y + dy) * w + (x + dx)) * 4 + c];
          }
        }
        const avg = sum / 9;
        dst[i + c] = Math.round(src[i + c] + (avg - src[i + c]) * amount);
      }
    }
  }
  return out;
}

/**
 * Auto-levels: stretch RGB so that the 2nd percentile becomes 0 and the
 * 98th percentile becomes 255. `amount` in [0,1] blends with the original
 * (1 = full stretch).
 */
function applyAutoLevels(data: ImageData, amount: number): void {
  if (amount <= 0) return;
  const px = data.data;
  const hist = new Uint32Array(256);
  const total = px.length / 4;
  for (let i = 0; i < px.length; i += 4) {
    const y = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    hist[y] += 1;
  }
  // Find low/high percentiles
  const lowTarget = total * 0.02;
  const highTarget = total * 0.98;
  let cum = 0;
  let lo = 0;
  let hi = 255;
  for (let i = 0; i < 256; i += 1) {
    cum += hist[i];
    if (cum >= lowTarget) { lo = i; break; }
  }
  cum = 0;
  for (let i = 0; i < 256; i += 1) {
    cum += hist[i];
    if (cum >= highTarget) { hi = i; break; }
  }
  if (hi - lo < 20) return; // already flat — don't over-stretch
  const span = hi - lo;
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i += 1) {
    const stretched = ((i - lo) * 255) / span;
    const blended = i + (stretched - i) * amount;
    lut[i] = Math.max(0, Math.min(255, Math.round(blended)));
  }
  for (let i = 0; i < px.length; i += 4) {
    px[i] = lut[px[i]];
    px[i + 1] = lut[px[i + 1]];
    px[i + 2] = lut[px[i + 2]];
  }
}

/**
 * Unsharp mask via 3×3 high-pass kernel, blended with the original by
 * `amount`. Safe default amount is 0.3.
 */
function applyUnsharpMask(data: ImageData, amount: number): ImageData {
  if (amount <= 0) return data;
  const { width: w, height: h } = data;
  const src = data.data;
  const out = new ImageData(w, h);
  const dst = out.data;
  // Copy edges untouched
  dst.set(src);
  const k = amount; // how much of the high-pass response to add back
  // Kernel: high-pass derived from identity - blur
  //  -1 -1 -1
  //  -1  9 -1
  //  -1 -1 -1
  // Blend: out = src + k*(highpass - src)  →  keep src as base
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const p = i + c;
        const hp =
          -1 * src[p - 4 - w * 4] +
          -1 * src[p - w * 4] +
          -1 * src[p + 4 - w * 4] +
          -1 * src[p - 4] +
          9 * src[p] +
          -1 * src[p + 4] +
          -1 * src[p - 4 + w * 4] +
          -1 * src[p + w * 4] +
          -1 * src[p + 4 + w * 4];
        const blended = src[p] + (hp - src[p]) * k;
        dst[p] = Math.max(0, Math.min(255, blended));
      }
      dst[i + 3] = src[i + 3]; // alpha
    }
  }
  return out;
}
