import type { ImageContentLabel, MotionPreset, MotionStyle } from './videoCompositor.types';

// ── Label Classification ──────────────────────────────────────────────

const LABEL_PATTERNS: Array<{ label: ImageContentLabel; pattern: RegExp }> = [
  { label: 'kitchen',     pattern: /\b(kitchen|ktchn|cooking)\b/i },
  { label: 'bedroom',     pattern: /\b(bedroom|master\s*suite|guest\s*room|bed[\s_-]*room|bdrm)\b/i },
  { label: 'bathroom',    pattern: /\b(bathroom|bath\b|ensuite|en-suite|bth\b|powder\s*room)\b/i },
  { label: 'living_room', pattern: /\b(living[\s_-]*room|great[\s_-]*room|family[\s_-]*room|living|lounge|sitting[\s_-]*room)\b/i },
  { label: 'dining_room', pattern: /\b(dining[\s_-]*room|dining[\s_-]*area|breakfast\s*nook|dining)\b/i },
  { label: 'exterior',    pattern: /\b(exterior|curb[\s_-]*appeal|front[\s_-]*(of|view|elevation)|facade|street[\s_-]*view|entry|entrance|porch)\b/i },
  { label: 'backyard',    pattern: /\b(backyard|back[\s_-]*yard|patio|deck|outdoor|garden|pool|terrace|balcony|courtyard|lanai)\b/i },
  { label: 'aerial',      pattern: /\b(aerial|drone|bird.s?\s*eye|overhead|satellite)\b/i },
];

/**
 * Classify an image's filename/label + optional tags array into an ImageContentLabel.
 * Checks label, tags, and optional URL path for room-type keywords.
 */
export function classifyImageLabel(
  label: string,
  tags: string[] = [],
  url?: string,
): ImageContentLabel {
  // Build combined text from all available metadata
  const parts = [label, ...tags];
  // Extract path segments from URL for classification hints
  if (url) {
    try {
      const pathname = new URL(url).pathname;
      // Replace slashes and common separators with spaces for pattern matching
      parts.push(pathname.replace(/[/_\-\.]/g, ' '));
    } catch {
      // URL might be a relative path
      parts.push(url.replace(/[/_\-\.]/g, ' '));
    }
  }
  const combined = parts.join(' ');
  for (const { label: contentLabel, pattern } of LABEL_PATTERNS) {
    if (pattern.test(combined)) return contentLabel;
  }

  // Second pass: check individual tags more thoroughly (match reasons often embed keywords)
  for (const tag of tags) {
    const tagLower = tag.toLowerCase();
    for (const { label: contentLabel, pattern } of LABEL_PATTERNS) {
      if (pattern.test(tagLower)) return contentLabel;
    }
  }

  return 'other';
}

// ── Motion Presets ────────────────────────────────────────────────────

const MOTION_MAP: Record<ImageContentLabel, MotionPreset> = {
  kitchen:     { type: 'pan_horizontal', scaleRange: [1.12, 1.12], panOffset: [-0.3, 0, 0.3, 0] },
  exterior:    { type: 'zoom_in',        scaleRange: [1.0, 1.15],  panOffset: [0, 0, 0, 0] },
  living_room: { type: 'pan_across',     scaleRange: [1.1, 1.1],   panOffset: [-0.4, 0, 0.4, 0] },
  bedroom:     { type: 'zoom_in',        scaleRange: [1.05, 1.18], panOffset: [0, 0, 0, 0] },
  bathroom:    { type: 'zoom_in',        scaleRange: [1.0, 1.2],   panOffset: [0, 0, 0, 0] },
  backyard:    { type: 'pan_horizontal', scaleRange: [1.08, 1.08], panOffset: [-0.25, 0, 0.25, 0] },
  dining_room: { type: 'pan_across',     scaleRange: [1.1, 1.1],   panOffset: [-0.35, 0, 0.35, 0] },
  aerial:      { type: 'zoom_out',       scaleRange: [1.2, 1.0],   panOffset: [0, 0, 0, 0] },
  other:       { type: 'zoom_in',        scaleRange: [1.0, 1.12],  panOffset: [0, 0, 0, 0] },
};

const CLIP_DURATIONS: Partial<Record<ImageContentLabel, number>> = {
  kitchen: 3.5,
  exterior: 4.0,
  living_room: 3.5,
  bedroom: 3.5,
  bathroom: 3.0,
  backyard: 3.5,
  dining_room: 3.5,
  aerial: 4.5,
};

const DEFAULT_CLIP_DURATION = 3.5;

/**
 * Resolve motion preset for a given label, alternating pan direction
 * on odd scene indices for visual variety.
 */
export function resolveMotionPreset(
  label: ImageContentLabel,
  sceneIndex: number,
): MotionPreset {
  const base = MOTION_MAP[label];
  // Alternate pan direction on odd indices
  if (sceneIndex % 2 === 1 && (base.type === 'pan_horizontal' || base.type === 'pan_across')) {
    return {
      ...base,
      panOffset: [
        base.panOffset[2],
        base.panOffset[3],
        base.panOffset[0],
        base.panOffset[1],
      ] as [number, number, number, number],
    };
  }
  return base;
}

/**
 * Get recommended clip duration in seconds for a given content label.
 */
export function getClipDuration(label: ImageContentLabel): number {
  return CLIP_DURATIONS[label] ?? DEFAULT_CLIP_DURATION;
}

// ── Motion Style Scaling ─────────────────────────────────────────────

const MOTION_STYLE_ZOOM_FACTOR: Record<MotionStyle, number> = {
  smooth: 1.0,
  dynamic: 1.4,
  slow: 0.6,
};

const MOTION_STYLE_DURATION_FACTOR: Record<MotionStyle, number> = {
  smooth: 1.0,
  dynamic: 0.85,
  slow: 1.25,
};

/**
 * Scale a motion preset's zoom spread and pan offset by the style factor.
 */
export function applyMotionStyle(base: MotionPreset, style: MotionStyle): MotionPreset {
  const factor = MOTION_STYLE_ZOOM_FACTOR[style];
  const [startScale, endScale] = base.scaleRange;
  const midScale = (startScale + endScale) / 2;
  const halfSpread = ((endScale - startScale) / 2) * factor;

  return {
    ...base,
    scaleRange: [midScale - halfSpread, midScale + halfSpread],
    panOffset: base.panOffset.map((v) => v * factor) as [number, number, number, number],
  };
}

/**
 * Get clip duration for a label scaled by motion style.
 */
export function getStyledClipDuration(label: ImageContentLabel, style: MotionStyle): number {
  const base = getClipDuration(label);
  return Math.round(base * MOTION_STYLE_DURATION_FACTOR[style] * 10) / 10;
}
