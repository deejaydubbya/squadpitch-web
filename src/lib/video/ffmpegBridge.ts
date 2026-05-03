import type { CompositorProgress } from './videoCompositor.types';

let ffmpegInstance: any = null;

/**
 * Check if the current browser supports the core video rendering APIs:
 * - MediaRecorder with VP8/VP9
 * - HTMLCanvasElement.captureStream
 *
 * Note: SharedArrayBuffer (needed for ffmpeg.wasm MP4 conversion) is NOT
 * required here — if unavailable, we gracefully fall back to WebM output.
 */
export function checkBrowserSupport(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'Not in browser environment' };
  }
  if (typeof MediaRecorder === 'undefined') {
    return { supported: false, reason: 'MediaRecorder API not available' };
  }
  const canvas = document.createElement('canvas');
  if (typeof canvas.captureStream !== 'function') {
    return { supported: false, reason: 'Canvas captureStream not available' };
  }
  const hasCodec =
    MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
    MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
  if (!hasCodec) {
    return { supported: false, reason: 'No WebM codec support (VP8/VP9)' };
  }
  return { supported: true };
}

/**
 * Check if MP4 conversion via ffmpeg.wasm is available (requires SharedArrayBuffer).
 */
export function canConvertToMp4(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}

/**
 * Lazily load and initialize ffmpeg.wasm singleton.
 */
async function getFFmpeg(): Promise<any> {
  if (ffmpegInstance) return ffmpegInstance;

  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { toBlobURL } = await import('@ffmpeg/util');

  const ffmpeg = new FFmpeg();

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

/**
 * Convert a WebM blob to MP4 using ffmpeg.wasm.
 */
export async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress: (p: CompositorProgress) => void,
): Promise<Blob> {
  onProgress({
    phase: 'converting',
    current: 0,
    total: 100,
    message: 'Loading video converter…',
  });

  const ffmpeg = await getFFmpeg();
  const { fetchFile } = await import('@ffmpeg/util');

  // Write input
  const inputData = await fetchFile(webmBlob);
  await ffmpeg.writeFile('input.webm', inputData);

  onProgress({
    phase: 'converting',
    current: 30,
    total: 100,
    message: 'Converting to MP4…',
  });

  // Convert
  await ffmpeg.exec([
    '-i', 'input.webm',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    'output.mp4',
  ]);

  onProgress({
    phase: 'converting',
    current: 90,
    total: 100,
    message: 'Reading output…',
  });

  // Read output
  const outputData = await ffmpeg.readFile('output.mp4');
  const mp4Blob = new Blob([outputData], { type: 'video/mp4' });

  // Cleanup
  await ffmpeg.deleteFile('input.webm');
  await ffmpeg.deleteFile('output.mp4');

  onProgress({
    phase: 'converting',
    current: 100,
    total: 100,
    message: 'Conversion complete',
  });

  return mp4Blob;
}
