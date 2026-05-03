import type { TextSlide } from './videoCompositor.types';

const MAX_TEXT_LENGTH = 80;

/**
 * Strip hashtags, URLs, and excess whitespace from text.
 */
function cleanText(text: string): string {
  return text
    .replace(/#\w+/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split cleaned text into sentences.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Truncate a sentence to MAX_TEXT_LENGTH, breaking at word boundary.
 */
function truncate(text: string): string {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  const cut = text.slice(0, MAX_TEXT_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…';
}

/**
 * Extract text slides from post body and optional CTA.
 *
 * - First sentence → hook (scene 0)
 * - Middle sentences → key points distributed across middle scenes
 * - CTA or last sentence → final scene
 */
export function extractTextSlides(
  body: string,
  cta: string | null,
  sceneCount: number,
): TextSlide[] {
  if (sceneCount === 0) return [];

  const cleaned = cleanText(body);
  const sentences = splitSentences(cleaned);
  if (sentences.length === 0) return [];

  const slides: TextSlide[] = [];

  // Hook: first sentence on scene 0
  slides.push({
    text: truncate(sentences[0]),
    role: 'hook',
    sceneIndex: 0,
  });

  // CTA on final scene
  const ctaText = cta ? truncate(cleanText(cta)) : null;
  const lastSceneIndex = sceneCount - 1;

  // Key points: distribute middle sentences across middle scenes
  const middleSentences = sentences.slice(1, ctaText ? undefined : -1);
  if (middleSentences.length > 0 && sceneCount > 2) {
    const middleSceneCount = sceneCount - 2; // exclude first and last
    const step = Math.max(1, Math.floor(middleSentences.length / middleSceneCount));
    let sentIdx = 0;
    for (let sceneIdx = 1; sceneIdx < lastSceneIndex && sentIdx < middleSentences.length; sceneIdx++) {
      slides.push({
        text: truncate(middleSentences[sentIdx]),
        role: 'key_point',
        sceneIndex: sceneIdx,
      });
      sentIdx += step;
    }
  }

  // Final scene: CTA or last sentence
  if (lastSceneIndex > 0) {
    if (ctaText) {
      slides.push({ text: ctaText, role: 'cta', sceneIndex: lastSceneIndex });
    } else if (sentences.length > 1) {
      slides.push({
        text: truncate(sentences[sentences.length - 1]),
        role: 'cta',
        sceneIndex: lastSceneIndex,
      });
    }
  }

  return slides;
}

// ── Canvas Rendering ──────────────────────────────────────────────────

export interface TextOverlayStyle {
  fontFamily: string;
  fontSize: number;
  color: string;
  backdropColor: string;
  /** Vertical position as fraction of canvas height (0.72 = 72% down) */
  yPosition: number;
  paddingX: number;
  paddingY: number;
}

const DEFAULT_STYLE: TextOverlayStyle = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 48,
  color: '#ffffff',
  backdropColor: 'rgba(0, 0, 0, 0.55)',
  yPosition: 0.72,
  paddingX: 32,
  paddingY: 16,
};

/**
 * Compute text opacity for fade-in/fade-out effect.
 * Fade in 0-15%, fully visible 15-85%, fade out 85-100%.
 */
function textOpacity(sceneProgress: number): number {
  if (sceneProgress < 0.15) return sceneProgress / 0.15;
  if (sceneProgress > 0.85) return (1 - sceneProgress) / 0.15;
  return 1;
}

/**
 * Draw text overlay on canvas with backdrop and fade animation.
 */
export function drawTextOverlay(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
  height: number,
  sceneProgress: number,
  style: TextOverlayStyle = DEFAULT_STYLE,
): void {
  const alpha = textOpacity(sceneProgress);
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${style.fontSize}px ${style.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Wrap text if needed
  const maxWidth = width - style.paddingX * 4;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = style.fontSize * 1.3;
  const blockHeight = lines.length * lineHeight;

  const x = width / 2;
  const y = height * style.yPosition;

  // Backdrop
  const backdropWidth = Math.min(
    width - style.paddingX * 2,
    Math.max(...lines.map((l) => ctx.measureText(l).width)) + style.paddingX * 2,
  );
  ctx.fillStyle = style.backdropColor;
  ctx.beginPath();
  roundRect(ctx, x - backdropWidth / 2, y - style.paddingY, backdropWidth, blockHeight + style.paddingY * 2, 12);
  ctx.fill();

  // Text
  ctx.fillStyle = style.color;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }

  ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
