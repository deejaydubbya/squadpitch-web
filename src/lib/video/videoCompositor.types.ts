// ── Image Content Classification ──────────────────────────────────────

export type ImageContentLabel =
  | 'kitchen'
  | 'exterior'
  | 'living_room'
  | 'bedroom'
  | 'bathroom'
  | 'backyard'
  | 'dining_room'
  | 'aerial'
  | 'other';

// ── Motion ────────────────────────────────────────────────────────────

export type MotionType = 'pan_horizontal' | 'zoom_in' | 'zoom_out' | 'pan_across';

export interface MotionPreset {
  type: MotionType;
  /** [startScale, endScale] */
  scaleRange: [number, number];
  /** [startX, startY, endX, endY] as fractions of available pan distance */
  panOffset: [number, number, number, number];
}

// ── Scenes ────────────────────────────────────────────────────────────

export interface SceneInput {
  imageUrl: string;
  label: ImageContentLabel;
  durationSec: number;
  text?: string;
  motion: MotionPreset;
}

export interface TextSlide {
  text: string;
  role: 'hook' | 'key_point' | 'cta';
  sceneIndex: number;
}

// ── Compositor I/O ────────────────────────────────────────────────────

export interface CompositorInput {
  scenes: SceneInput[];
  outputWidth: number;
  outputHeight: number;
  transitionDurationSec: number;
  fps: number;
  channel: string;
}

export type CompositorPhase = 'loading_images' | 'rendering' | 'encoding' | 'converting';

export interface CompositorProgress {
  phase: CompositorPhase;
  current: number;
  total: number;
  message: string;
}

export interface CompositorResult {
  webmBlob: Blob;
  mp4Blob: Blob;
  durationSec: number;
  width: number;
  height: number;
}

// ── Smart Video Config ───────────────────────────────────────────────

export type MotionStyle = 'smooth' | 'dynamic' | 'slow';

export interface SmartVideoConfig {
  scenes: SmartVideoSceneConfig[];
  motionStyle: MotionStyle;
  transitionDurationSec: number;
  personaFrames?: {
    intro?: boolean;
    outro?: boolean;
    thumbnail?: boolean;
  };
}

export interface SmartVideoSceneConfig {
  imageUrl: string;
  label: ImageContentLabel;
  /** Original image label/filename for display when classification is 'other' */
  originalLabel?: string;
  durationSec: number;       // user-configurable, 0.5–10.0s
  text?: string;              // editable overlay text
  textRole?: 'hook' | 'key_point' | 'cta';
  confidence: number;
  tags: string[];
}

// ── Future hooks (stubs) ──────────────────────────────────────────────

export interface ParallaxConfig {
  depthLayers: number;
  separationPx: number;
}

export interface DepthMotionConfig {
  depthMap: ImageData;
  focusPoint: [number, number];
}

export interface MusicTrack {
  id: string;
  url: string;
  bpm: number;
  durationSec: number;
  genre: string;
}

export interface BeatSyncConfig {
  track: MusicTrack;
  beatTimestamps: number[];
  transitionOnBeat: boolean;
}
