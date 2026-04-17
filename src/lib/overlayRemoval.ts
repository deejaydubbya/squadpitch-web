// Client-side overlay detection + safe inpainting for screenshot-imported
// listing photos (spinstr112 rewrite).
//
// Philosophy: match imageQuality.ts — "restoration, not fabrication."
// We detect small UI overlays on listing screenshots (text labels like
// "Kitchen", photo counters, virtual-tour chips, map icons, bottom strips
// like "Fly around") and repaint them using pixels from just outside the
// overlay. No AI, no hallucination. When cleanup confidence is low we
// return the original untouched.
//
// Detection combines three signals (not edge density alone):
//   1. Edge density — text / icons produce strong local gradients.
//   2. Local luma variance — UI chips/pills sit on top of near-uniform
//      backgrounds, so the surrounding ring is flatter than a photo.
//   3. Neighborhood contrast — UI overlays are designed to stand out
//      against the content behind them.
//
// Masks are dilated before inpainting so padding, glow, and chip
// backgrounds don't leak. Inpainting picks between "uniform neighbor mean
// fill" (for smooth backgrounds) and "directional tile" (for textured
// backgrounds) per box.

export type OverlayKind =
  | 'text_label'
  | 'pill'
  | 'badge'
  | 'icon'
  | 'arrow'
  | 'strip'
  | 'watermark';

export type CleanupConfidence = 'high' | 'medium' | 'low';

export interface OverlayRegion {
  x: number;       // pixel coords in source image
  y: number;
  w: number;
  h: number;
  kind: OverlayKind;
  confidence: number;   // 0-1 detection confidence
  inpainted?: boolean;  // set by cleanImage once it tries to repaint
}

export interface CleanResult {
  dataUrl: string;              // cleaned JPEG (or original if no-op)
  overlays: OverlayRegion[];    // detected regions with inpaint flags
  removed: boolean;             // true if any repaint happened
  confidence: CleanupConfidence;// overall cleanup confidence
  inpaintSucceeded: boolean;    // true if ≥1 overlay was inpainted successfully
}

// ── Image loading / raw access ──────────────────────────────────────────

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('overlay image load failed'));
    img.src = src;
  });
}

function drawToCanvas(
  img: HTMLImageElement,
  targetW?: number,
  targetH?: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } {
  const w = targetW ?? img.naturalWidth;
  const h = targetH ?? img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

// ── Feature maps ────────────────────────────────────────────────────────

interface FeatureMaps {
  w: number;
  h: number;
  luma: Uint8Array;
  edges: Uint8Array;
  /** per-pixel RGB for mean-color sampling in inpaint */
  pix: Uint8ClampedArray;
}

function buildFeatures(pix: Uint8ClampedArray, w: number, h: number): FeatureMaps {
  const luma = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < pix.length; i += 4, j += 1) {
    luma[j] = Math.round(0.2126 * pix[i] + 0.7152 * pix[i + 1] + 0.0722 * pix[i + 2]);
  }
  const edges = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const dx = Math.abs(luma[i + 1] - luma[i - 1]);
      const dy = Math.abs(luma[i + w] - luma[i - w]);
      edges[i] = Math.min(255, dx + dy);
    }
  }
  return { w, h, luma, edges, pix };
}

// ── Cell-grid aggregates (sliding window over full image) ───────────────

interface CellGrid {
  cellW: number;
  cellH: number;
  cols: number;
  rows: number;
  /** mean edge strength per cell */
  edge: Float32Array;
  /** luma stddev per cell — low = uniform (chip background) */
  lumaStd: Float32Array;
  /** luma mean per cell */
  lumaMean: Float32Array;
}

function buildCellGrid(f: FeatureMaps, cellW: number, cellH: number): CellGrid {
  const cols = Math.max(1, Math.floor(f.w / cellW));
  const rows = Math.max(1, Math.floor(f.h / cellH));
  const edge = new Float32Array(cols * rows);
  const lumaStd = new Float32Array(cols * rows);
  const lumaMean = new Float32Array(cols * rows);
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const cx0 = gx * cellW;
      const cy0 = gy * cellH;
      let eSum = 0;
      let lSum = 0;
      let cnt = 0;
      for (let yy = 0; yy < cellH; yy += 1) {
        for (let xx = 0; xx < cellW; xx += 1) {
          const px = cx0 + xx;
          const py = cy0 + yy;
          if (px >= f.w || py >= f.h) continue;
          const i = py * f.w + px;
          eSum += f.edges[i];
          lSum += f.luma[i];
          cnt += 1;
        }
      }
      const idx = gy * cols + gx;
      const em = cnt > 0 ? eSum / cnt : 0;
      const lm = cnt > 0 ? lSum / cnt : 0;
      edge[idx] = em;
      lumaMean[idx] = lm;
      // Second pass for variance
      let v = 0;
      for (let yy = 0; yy < cellH; yy += 1) {
        for (let xx = 0; xx < cellW; xx += 1) {
          const px = cx0 + xx;
          const py = cy0 + yy;
          if (px >= f.w || py >= f.h) continue;
          const d = f.luma[py * f.w + px] - lm;
          v += d * d;
        }
      }
      lumaStd[idx] = cnt > 0 ? Math.sqrt(v / cnt) : 0;
    }
  }
  return { cellW, cellH, cols, rows, edge, lumaStd, lumaMean };
}

// ── Zone priors ─────────────────────────────────────────────────────────

interface ZonePrior {
  nx: number; ny: number; nw: number; nh: number;
  boost: number;        // multiplier on candidate score
  kindHint: OverlayKind;
}

// Priors where UI overlays commonly appear. These BIAS scoring — they
// don't restrict detection. An overlay in the middle of the image can
// still be detected, just without the zone boost.
const ZONE_PRIORS: ZonePrior[] = [
  { nx: 0.0, ny: 0.72, nw: 0.55, nh: 0.28, boost: 1.4, kindHint: 'text_label' }, // bottom-left room labels
  { nx: 0.0, ny: 0.0,  nw: 0.40, nh: 0.15, boost: 1.3, kindHint: 'watermark' },  // top-left watermark
  { nx: 0.6, ny: 0.0,  nw: 0.40, nh: 0.15, boost: 1.3, kindHint: 'badge' },      // top-right counter
  { nx: 0.6, ny: 0.72, nw: 0.40, nh: 0.28, boost: 1.3, kindHint: 'badge' },      // bottom-right badge
  { nx: 0.3, ny: 0.0,  nw: 0.40, nh: 0.12, boost: 1.2, kindHint: 'badge' },      // top-center counter
  { nx: 0.15,ny: 0.85, nw: 0.70, nh: 0.15, boost: 1.5, kindHint: 'strip' },      // bottom strip ("Fly around")
  { nx: 0.7, ny: 0.15, nw: 0.30, nh: 0.65, boost: 1.2, kindHint: 'icon' },       // right-edge icon column
  { nx: 0.0, ny: 0.15, nw: 0.15, nh: 0.65, boost: 1.2, kindHint: 'icon' },       // left-edge icon column
];

function zoneBoost(cx: number, cy: number, w: number, h: number): { boost: number; hint: OverlayKind | null } {
  let best = { boost: 1.0, hint: null as OverlayKind | null };
  for (const z of ZONE_PRIORS) {
    const zx = z.nx * w;
    const zy = z.ny * h;
    const zw = z.nw * w;
    const zh = z.nh * h;
    if (cx >= zx && cx < zx + zw && cy >= zy && cy < zy + zh) {
      if (z.boost > best.boost) best = { boost: z.boost, hint: z.kindHint };
    }
  }
  return best;
}

// ── Overlay detection ──────────────────────────────────────────────────

interface RawCandidate {
  gx0: number; gy0: number; gx1: number; gy1: number; // inclusive cell coords
  score: number;
  kindHint: OverlayKind | null;
}

export async function detectOverlays(dataUrl: string): Promise<OverlayRegion[]> {
  const img = await loadImage(dataUrl);
  const maxDim = 400;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(40, Math.round(img.naturalWidth * scale));
  const h = Math.max(40, Math.round(img.naturalHeight * scale));
  const { ctx } = drawToCanvas(img, w, h);
  const pix = ctx.getImageData(0, 0, w, h).data;
  const features = buildFeatures(pix, w, h);

  // Use ~2% of the smaller dim as cell size — small enough to tightly
  // bound text glyphs, big enough to stay fast.
  const cellSize = Math.max(4, Math.round(Math.min(w, h) * 0.025));
  const grid = buildCellGrid(features, cellSize, cellSize);

  // Global edge stats so we know what "dense" means for this image.
  let gSum = 0;
  for (let k = 0; k < grid.edge.length; k += 1) gSum += grid.edge[k];
  const gMean = gSum / grid.edge.length;
  let gVar = 0;
  for (let k = 0; k < grid.edge.length; k += 1) {
    const d = grid.edge[k] - gMean;
    gVar += d * d;
  }
  const gStd = Math.sqrt(gVar / grid.edge.length);
  const edgeThr = gMean + Math.max(10, gStd * 1.0);

  // Per-cell "UI-ness" score combining edge density with surrounding
  // flatness (chip background) and zone prior.
  const cellScore = new Float32Array(grid.edge.length);
  for (let gy = 0; gy < grid.rows; gy += 1) {
    for (let gx = 0; gx < grid.cols; gx += 1) {
      const idx = gy * grid.cols + gx;
      const e = grid.edge[idx];
      if (e < edgeThr) continue;

      // Neighborhood flatness — average luma stddev of the 8 neighbors.
      // UI chips are surrounded by either the chip bg (low std) OR the
      // photo content below (higher std). A chip WITH a background will
      // show a strongly flat ring to at least one side, captured later
      // by the bbox-edge check. For cell scoring, we reward cells that
      // are high-edge AND contrast strongly vs an 8-neighbor mean.
      let sumNbMean = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || nx >= grid.cols || ny < 0 || ny >= grid.rows) continue;
          sumNbMean += grid.lumaMean[ny * grid.cols + nx];
          cnt += 1;
        }
      }
      const nbMean = cnt > 0 ? sumNbMean / cnt : grid.lumaMean[idx];
      const contrast = Math.abs(grid.lumaMean[idx] - nbMean) / 128; // 0..~1

      const cxPx = gx * grid.cellW + grid.cellW / 2;
      const cyPx = gy * grid.cellH + grid.cellH / 2;
      const { boost } = zoneBoost(cxPx, cyPx, w, h);

      // Composite: edge strength above threshold × contrast × zone boost.
      const edgeNorm = Math.min(1, (e - edgeThr) / 80);
      cellScore[idx] = edgeNorm * (0.5 + 0.5 * Math.min(1, contrast * 2)) * boost;
    }
  }

  // Greedy flood-fill connected components over cellScore > 0 cells.
  const visited = new Uint8Array(cellScore.length);
  const candidates: RawCandidate[] = [];
  for (let gy = 0; gy < grid.rows; gy += 1) {
    for (let gx = 0; gx < grid.cols; gx += 1) {
      const idx = gy * grid.cols + gx;
      if (visited[idx] || cellScore[idx] <= 0) continue;
      // BFS over connected hot cells.
      const queue: number[] = [idx];
      visited[idx] = 1;
      let minX = gx, maxX = gx, minY = gy, maxY = gy;
      let scoreSum = cellScore[idx];
      let scoreCnt = 1;
      while (queue.length > 0) {
        const q = queue.shift()!;
        const qx = q % grid.cols;
        const qy = Math.floor(q / grid.cols);
        const neighbors = [q - 1, q + 1, q - grid.cols, q + grid.cols];
        const validX = [qx - 1, qx + 1, qx, qx];
        const validY = [qy, qy, qy - 1, qy + 1];
        for (let n = 0; n < 4; n += 1) {
          const ni = neighbors[n];
          const nx = validX[n];
          const ny = validY[n];
          if (nx < 0 || nx >= grid.cols || ny < 0 || ny >= grid.rows) continue;
          if (visited[ni] || cellScore[ni] <= 0) continue;
          visited[ni] = 1;
          queue.push(ni);
          if (nx < minX) minX = nx;
          if (nx > maxX) maxX = nx;
          if (ny < minY) minY = ny;
          if (ny > maxY) maxY = ny;
          scoreSum += cellScore[ni];
          scoreCnt += 1;
        }
      }
      const avgScore = scoreSum / scoreCnt;
      const cxPx = ((minX + maxX) / 2) * grid.cellW;
      const cyPx = ((minY + maxY) / 2) * grid.cellH;
      const { hint } = zoneBoost(cxPx, cyPx, w, h);
      candidates.push({ gx0: minX, gy0: minY, gx1: maxX, gy1: maxY, score: avgScore, kindHint: hint });
    }
  }

  // Convert to pixel boxes, validate, classify, dilate.
  const inv = 1 / scale;
  const regions: OverlayRegion[] = [];
  for (const c of candidates) {
    const px0 = c.gx0 * grid.cellW;
    const py0 = c.gy0 * grid.cellH;
    const pxW = (c.gx1 - c.gx0 + 1) * grid.cellW;
    const pxH = (c.gy1 - c.gy0 + 1) * grid.cellH;

    const normW = pxW / w;
    const normH = pxH / h;
    const ar = pxW / Math.max(1, pxH);

    // Size sanity — reject obvious photo regions (too big) and noise
    // (below ~2% of image area). Allow small icons (0.01 normH).
    if (normW > 0.60 || normH > 0.30) continue;
    if (normW * normH < 0.0005) continue;
    if (pxW < 6 || pxH < 6) continue;

    // Classify
    const kind = classify(c, pxW, pxH, ar, normW, normH);

    // Detection confidence — already includes zone boost via cellScore.
    const confidence = Math.min(1, c.score);
    if (confidence < 0.2) continue;

    regions.push({
      x: Math.max(0, Math.round(px0 * inv)),
      y: Math.max(0, Math.round(py0 * inv)),
      w: Math.round(pxW * inv),
      h: Math.round(pxH * inv),
      kind,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  return dedupeOverlays(regions);
}

function classify(
  c: RawCandidate,
  pxW: number,
  pxH: number,
  ar: number,
  normW: number,
  normH: number,
): OverlayKind {
  if (c.kindHint === 'strip' && normW > 0.4) return 'strip';
  if (c.kindHint === 'watermark') return 'watermark';
  // Small square → icon or arrow
  if (pxW < 30 && pxH < 30 && ar > 0.6 && ar < 1.6) {
    return c.kindHint === 'icon' ? 'icon' : 'icon';
  }
  // Wide and flat → text label or strip
  if (ar > 3 && normH < 0.08) return normW > 0.35 ? 'strip' : 'text_label';
  // Roughly rectangular chip
  if (ar > 1.4 && ar < 6 && normH < 0.12) return 'pill';
  // Small box
  if (normW < 0.15 && normH < 0.1) return 'badge';
  return c.kindHint ?? 'text_label';
}

function dedupeOverlays(list: OverlayRegion[]): OverlayRegion[] {
  const sorted = [...list].sort((a, b) => b.confidence - a.confidence);
  const kept: OverlayRegion[] = [];
  for (const r of sorted) {
    const overlap = kept.find((k) => overlapFrac(k, r) > 0.3);
    if (!overlap) kept.push(r);
  }
  return kept;
}

function overlapFrac(a: OverlayRegion, b: OverlayRegion): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const minArea = Math.min(a.w * a.h, b.w * b.h);
  return minArea > 0 ? inter / minArea : 0;
}

// ── Mask dilation ───────────────────────────────────────────────────────

/**
 * Expand an overlay box by a type-dependent amount so we catch padding,
 * chip background, and glow/shadow rings. Capped to image bounds.
 */
function dilateBox(
  box: OverlayRegion,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const padByKind: Record<OverlayKind, number> = {
    text_label: 3,
    pill: 6,
    badge: 5,
    icon: 4,
    arrow: 4,
    strip: 3,
    watermark: 4,
  };
  // Scale pad with box size so big chips dilate proportionally.
  const base = padByKind[box.kind] ?? 4;
  const pad = Math.min(base + Math.round(Math.min(box.w, box.h) * 0.08), 14);
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const right = Math.min(w, box.x + box.w + pad);
  const bottom = Math.min(h, box.y + box.h + pad);
  return { x, y, w: right - x, h: bottom - y };
}

// ── Inpainting ──────────────────────────────────────────────────────────

/**
 * Per-box repaint result. inpainted = whether we judged the repaint to be
 * believable (boundary seam not obvious).
 */
interface InpaintOutcome {
  inpainted: boolean;
}

function sampleStripMean(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
): { r: number; g: number; b: number; std: number } | null {
  if (w <= 0 || h <= 0) return null;
  const d = ctx.getImageData(x, y, w, h).data;
  let r = 0, g = 0, b = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
  }
  r /= n; g /= n; b /= n;
  // stddev on luma
  let v = 0;
  for (let i = 0; i < d.length; i += 4) {
    const y2 = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const yMean = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const dd = y2 - yMean;
    v += dd * dd;
  }
  return { r, g, b, std: Math.sqrt(v / n) };
}

function inpaintBox(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dilated: { x: number; y: number; w: number; h: number },
): InpaintOutcome {
  const bx = dilated.x;
  const by = dilated.y;
  const bw = dilated.w;
  const bh = dilated.h;
  if (bw <= 0 || bh <= 0) return { inpainted: false };

  const stripT = Math.min(8, by);
  const stripB = Math.min(8, h - (by + bh));
  const stripL = Math.min(8, bx);
  const stripR = Math.min(8, w - (bx + bw));

  const top = stripT > 0 ? sampleStripMean(ctx, bx, by - stripT, bw, stripT) : null;
  const bot = stripB > 0 ? sampleStripMean(ctx, bx, by + bh, bw, stripB) : null;
  const lft = stripL > 0 ? sampleStripMean(ctx, bx - stripL, by, stripL, bh) : null;
  const rgt = stripR > 0 ? sampleStripMean(ctx, bx + bw, by, stripR, bh) : null;

  const strips = [top, bot, lft, rgt].filter(Boolean) as NonNullable<typeof top>[];
  if (strips.length === 0) return { inpainted: false };

  // Uniform neighborhood heuristic: all strips are flat AND similar in color.
  const meanStd = strips.reduce((s, x) => s + x.std, 0) / strips.length;
  const avgR = strips.reduce((s, x) => s + x.r, 0) / strips.length;
  const avgG = strips.reduce((s, x) => s + x.g, 0) / strips.length;
  const avgB = strips.reduce((s, x) => s + x.b, 0) / strips.length;
  const maxColorDrift = strips.reduce((m, x) => Math.max(
    m,
    Math.abs(x.r - avgR) + Math.abs(x.g - avgG) + Math.abs(x.b - avgB),
  ), 0);
  const isUniform = meanStd < 12 && maxColorDrift < 40;

  if (isUniform) {
    fillMeanColor(ctx, bx, by, bw, bh, avgR, avgG, avgB);
    featherBlend(ctx, bx, by, bw, bh, w, h);
    // Boundary seam quality: for uniform fills, confidence is high.
    return { inpainted: true };
  }

  // Textured neighborhood → directional tile using the widest safe strip.
  const sides = [
    { side: 'top' as const,    margin: by,           present: !!top },
    { side: 'bottom' as const, margin: h - (by + bh), present: !!bot },
    { side: 'left' as const,   margin: bx,            present: !!lft },
    { side: 'right' as const,  margin: w - (bx + bw), present: !!rgt },
  ].filter((s) => s.present).sort((a, b) => b.margin - a.margin);
  if (sides.length === 0) return { inpainted: false };
  const best = sides[0];
  const pad = 8;
  const thickness = Math.min(pad, best.margin);
  if (thickness < 2) return { inpainted: false };

  let src: ImageData;
  if (best.side === 'top') {
    src = ctx.getImageData(bx, by - thickness, bw, thickness);
  } else if (best.side === 'bottom') {
    src = ctx.getImageData(bx, by + bh, bw, thickness);
  } else if (best.side === 'left') {
    src = ctx.getImageData(bx - thickness, by, thickness, bh);
  } else {
    src = ctx.getImageData(bx + bw, by, thickness, bh);
  }
  const tmp = document.createElement('canvas');
  tmp.width = src.width;
  tmp.height = src.height;
  const tmpCtx = tmp.getContext('2d');
  if (!tmpCtx) return { inpainted: false };
  tmpCtx.putImageData(src, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tmp, 0, 0, src.width, src.height, bx, by, bw, bh);
  ctx.restore();
  featherBlend(ctx, bx, by, bw, bh, w, h);

  // Judge quality: stretch-tile on textured backgrounds is best-effort.
  // If the strip was thin relative to the box height, confidence is lower.
  const boxLongSide = best.side === 'top' || best.side === 'bottom' ? bh : bw;
  const stretched = boxLongSide / Math.max(1, thickness);
  const inpainted = stretched < 20;
  return { inpainted };
}

function fillMeanColor(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number, g: number, b: number,
): void {
  ctx.save();
  ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  // Add tiny noise so a solid patch doesn't stand out from grainy photo.
  const imgData = ctx.getImageData(x, y, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 8;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(imgData, x, y);
}

/**
 * Soften an 8px border around the patch by averaging the ring with its
 * 3×3 neighborhood. Hides seams on smooth backgrounds; invisible on busy.
 */
function featherBlend(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  w: number,
  h: number,
): void {
  const ring = 8;
  const rx = Math.max(0, bx - ring);
  const ry = Math.max(0, by - ring);
  const rw = Math.min(w - rx, bw + ring * 2);
  const rh = Math.min(h - ry, bh + ring * 2);
  if (rw <= 2 || rh <= 2) return;
  const src = ctx.getImageData(rx, ry, rw, rh);
  const px = src.data;
  const copy = new Uint8ClampedArray(px);
  for (let y = 0; y < rh; y += 1) {
    for (let x = 0; x < rw; x += 1) {
      const absX = rx + x;
      const absY = ry + y;
      const insideX = absX >= bx && absX < bx + bw;
      const insideY = absY >= by && absY < by + bh;
      const inRingX = absX >= bx - ring && absX < bx + bw + ring;
      const inRingY = absY >= by - ring && absY < by + bh + ring;
      const onRing = !(insideX && insideY) && inRingX && inRingY;
      if (!onRing) continue;
      let r = 0, g = 0, b = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= rw || ny < 0 || ny >= rh) continue;
          const k = (ny * rw + nx) * 4;
          r += copy[k];
          g += copy[k + 1];
          b += copy[k + 2];
          cnt += 1;
        }
      }
      if (cnt > 0) {
        const k = (y * rw + x) * 4;
        px[k] = Math.round(r / cnt);
        px[k + 1] = Math.round(g / cnt);
        px[k + 2] = Math.round(b / cnt);
      }
    }
  }
  ctx.putImageData(src, rx, ry);
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Detect + remove overlays on a single image.
 *
 * Return contract:
 *   - If no overlays detected → original, confidence 'high', removed=false.
 *   - If detections but all low-confidence → original, confidence 'low',
 *     removed=false.
 *   - If detections but a majority of inpaints fail → original preserved,
 *     confidence 'low', removed=false. (Prefer original when unsure.)
 *   - Otherwise → cleaned image, confidence 'high'|'medium' per inpaint
 *     success rate.
 */
export async function cleanImage(dataUrl: string): Promise<CleanResult> {
  const firstPass = await detectOverlays(dataUrl);
  if (firstPass.length === 0) {
    return {
      dataUrl, overlays: [], removed: false, confidence: 'high', inpaintSucceeded: false,
    };
  }

  const REPAINT_GATE = 0.25;
  const repaintable = firstPass.filter((o) => o.confidence >= REPAINT_GATE);
  if (repaintable.length === 0) {
    return {
      dataUrl, overlays: firstPass, removed: false, confidence: 'low', inpaintSucceeded: false,
    };
  }

  const img = await loadImage(dataUrl);
  const { canvas, ctx, w, h } = drawToCanvas(img);

  const results: OverlayRegion[] = [];
  for (const ov of repaintable) {
    const dilated = dilateBox(ov, w, h);
    const outcome = inpaintBox(ctx, w, h, dilated);
    results.push({ ...ov, inpainted: outcome.inpainted });
  }

  // Second pass — rerun detection on the repainted canvas so overlays
  // previously next to a bigger one can be caught. Cap at 2 passes total.
  try {
    const intermediate = canvas.toDataURL('image/jpeg', 0.92);
    const secondPass = await detectOverlays(intermediate);
    const newOnes = secondPass.filter(
      (o) => o.confidence >= REPAINT_GATE &&
        !results.some((r) => overlapFrac(r, o) > 0.3),
    );
    for (const ov of newOnes) {
      const dilated = dilateBox(ov, w, h);
      const outcome = inpaintBox(ctx, w, h, dilated);
      results.push({ ...ov, inpainted: outcome.inpainted });
    }
  } catch {
    // best-effort
  }

  const okCount = results.filter((r) => r.inpainted).length;
  const successRate = okCount / Math.max(1, results.length);
  const inpaintSucceeded = okCount > 0;

  // Roll back to original if we didn't meaningfully improve the image.
  if (successRate < 0.5) {
    return {
      dataUrl,
      overlays: results,
      removed: false,
      confidence: 'low',
      inpaintSucceeded,
    };
  }

  const confidence: CleanupConfidence =
    successRate >= 0.85 ? 'high' : 'medium';

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    overlays: results,
    removed: true,
    confidence,
    inpaintSucceeded,
  };
}
