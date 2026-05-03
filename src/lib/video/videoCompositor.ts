import type {
  CompositorInput,
  CompositorProgress,
  SceneInput,
} from './videoCompositor.types';
import { drawTextOverlay } from './textOverlay';

/**
 * Cubic ease-in-out for smooth motion interpolation.
 */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Linearly interpolate between two values.
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Load all scene images in parallel, returning ImageBitmaps.
 */
async function loadAllImages(
  scenes: SceneInput[],
  onProgress: (p: CompositorProgress) => void,
  signal: AbortSignal,
): Promise<ImageBitmap[]> {
  const total = scenes.length;
  const bitmaps: ImageBitmap[] = [];

  const results = await Promise.all(
    scenes.map(async (scene, i) => {
      const res = await fetch(scene.imageUrl, { signal });
      if (!res.ok) throw new Error(`Failed to load image: ${scene.imageUrl}`);
      const blob = await res.blob();
      const bmp = await createImageBitmap(blob);
      onProgress({
        phase: 'loading_images',
        current: i + 1,
        total,
        message: `Loading image ${i + 1}/${total}`,
      });
      return bmp;
    }),
  );

  bitmaps.push(...results);
  return bitmaps;
}

/**
 * Draw an image with cover-fit (like CSS object-fit: cover) centered on canvas.
 */
function drawCoverFit(
  ctx: CanvasRenderingContext2D,
  img: ImageBitmap,
  canvasW: number,
  canvasH: number,
  scale: number,
  panX: number,
  panY: number,
): void {
  const imgAspect = img.width / img.height;
  const canvasAspect = canvasW / canvasH;

  let drawW: number, drawH: number;
  if (imgAspect > canvasAspect) {
    // Image is wider — fit by height
    drawH = canvasH * scale;
    drawW = drawH * imgAspect;
  } else {
    // Image is taller — fit by width
    drawW = canvasW * scale;
    drawH = drawW / imgAspect;
  }

  // Center + pan offset
  const x = (canvasW - drawW) / 2 + panX * (drawW - canvasW);
  const y = (canvasH - drawH) / 2 + panY * (drawH - canvasH);

  ctx.drawImage(img, x, y, drawW, drawH);
}

/**
 * Render a single frame at the given time, handling Ken Burns motion + crossfade.
 */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  images: ImageBitmap[],
  scenes: SceneInput[],
  time: number,
  width: number,
  height: number,
  transitionDuration: number,
): void {
  // Clear
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // Find current scene
  let elapsed = 0;
  let sceneIdx = 0;
  for (let i = 0; i < scenes.length; i++) {
    if (time < elapsed + scenes[i].durationSec) {
      sceneIdx = i;
      break;
    }
    elapsed += scenes[i].durationSec;
    if (i === scenes.length - 1) sceneIdx = i;
  }

  const scene = scenes[sceneIdx];
  const sceneTime = time - elapsed;
  const sceneProgress = Math.min(1, sceneTime / scene.durationSec);
  const eased = easeInOut(sceneProgress);

  // Ken Burns transform
  const scale = lerp(scene.motion.scaleRange[0], scene.motion.scaleRange[1], eased);
  const panX = lerp(scene.motion.panOffset[0], scene.motion.panOffset[2], eased);
  const panY = lerp(scene.motion.panOffset[1], scene.motion.panOffset[3], eased);

  // Check if we're in a crossfade transition
  const isInTransition = sceneIdx > 0 && sceneTime < transitionDuration;
  const isEndTransition = sceneIdx < scenes.length - 1 &&
    sceneTime > scene.durationSec - transitionDuration;

  if (isInTransition) {
    // Crossfade from previous scene
    const fadeProgress = sceneTime / transitionDuration;
    const prevScene = scenes[sceneIdx - 1];
    const prevScale = prevScene.motion.scaleRange[1]; // end of previous
    const prevPanX = prevScene.motion.panOffset[2];
    const prevPanY = prevScene.motion.panOffset[3];

    ctx.globalAlpha = 1 - fadeProgress;
    drawCoverFit(ctx, images[sceneIdx - 1], width, height, prevScale, prevPanX, prevPanY);
    ctx.globalAlpha = fadeProgress;
    drawCoverFit(ctx, images[sceneIdx], width, height, scale, panX, panY);
    ctx.globalAlpha = 1;
  } else {
    drawCoverFit(ctx, images[sceneIdx], width, height, scale, panX, panY);
  }

  // Text overlay
  if (scene.text) {
    drawTextOverlay(ctx, scene.text, width, height, sceneProgress);
  }
}

/**
 * Compute total video duration from scenes.
 */
function totalDuration(scenes: SceneInput[]): number {
  return scenes.reduce((sum, s) => sum + s.durationSec, 0);
}

/**
 * Core video compositor.
 * Renders frames to a canvas and captures via MediaRecorder as WebM/VP9.
 */
export async function composit(
  input: CompositorInput,
  onProgress: (p: CompositorProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const { scenes, outputWidth, outputHeight, transitionDurationSec, fps } = input;

  // Load images
  const images = await loadAllImages(scenes, onProgress, signal);

  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d')!;

  // Set up MediaRecorder
  const stream = canvas.captureStream(0); // 0 = manual frame capture
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm;codecs=vp8';
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 8_000_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const duration = totalDuration(scenes);
  const totalFrames = Math.ceil(duration * fps);
  const frameDuration = 1 / fps;

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);

    recorder.start();

    let frame = 0;
    const renderNext = () => {
      if (signal.aborted) {
        recorder.stop();
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      if (frame >= totalFrames) {
        onProgress({
          phase: 'encoding',
          current: totalFrames,
          total: totalFrames,
          message: 'Finalizing video…',
        });
        recorder.stop();
        return;
      }

      const time = frame * frameDuration;
      renderFrame(ctx, images, scenes, time, outputWidth, outputHeight, transitionDurationSec);

      // Request frame capture from the stream track
      const track = stream.getVideoTracks()[0];
      if (track && 'requestFrame' in track) {
        (track as any).requestFrame();
      }

      frame++;
      if (frame % 10 === 0) {
        onProgress({
          phase: 'rendering',
          current: frame,
          total: totalFrames,
          message: `Rendering frame ${frame}/${totalFrames}`,
        });
      }

      // Delay to match real frame rate so MediaRecorder timestamps are correct
      setTimeout(renderNext, frameDuration * 1000);
    };

    renderNext();
  });
}
