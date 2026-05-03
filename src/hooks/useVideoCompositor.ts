'use client';

import { useState, useRef, useCallback } from 'react';
import type { CompositorProgress, CompositorResult, ImageContentLabel, SmartVideoConfig } from '@/lib/video/videoCompositor.types';
import { classifyImageLabel, resolveMotionPreset, getClipDuration, applyMotionStyle } from '@/lib/video/motionPresets';
import { extractTextSlides } from '@/lib/video/textOverlay';

export type VideoPhase = 'idle' | 'compositing' | 'converting' | 'done' | 'error';

export interface VideoImageInput {
  url: string;
  label: string;
  tags: string[];
  confidence: number;
}

export interface UseVideoCompositorReturn {
  phase: VideoPhase;
  progress: CompositorProgress | null;
  result: CompositorResult | null;
  previewUrl: string | null;
  error: string | null;
  generate: (images: VideoImageInput[], body: string, cta: string | null, channel: string) => void;
  generateFromConfig: (config: SmartVideoConfig, channel: string) => void;
  abort: () => void;
  reset: () => void;
}

export function useVideoCompositor(): UseVideoCompositorReturn {
  const [phase, setPhase] = useState<VideoPhase>('idle');
  const [progress, setProgress] = useState<CompositorProgress | null>(null);
  const [result, setResult] = useState<CompositorResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setPhase('idle');
    setProgress(null);
    setResult(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    reset();
  }, [reset]);

  const generate = useCallback(
    async (images: VideoImageInput[], body: string, cta: string | null, channel: string) => {
      reset();

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setPhase('compositing');

        // Filter to images with sufficient confidence
        const validImages = images.filter((img) => img.confidence >= 25 && img.url);
        if (validImages.length < 1) {
          throw new Error('Need at least 1 image to create a Smart Video');
        }

        // Classify and build scenes
        const labels: ImageContentLabel[] = validImages.map((img) =>
          classifyImageLabel(img.label, img.tags, img.url),
        );
        const textSlides = extractTextSlides(body, cta, validImages.length);
        const textByScene = new Map(textSlides.map((s) => [s.sceneIndex, s.text]));

        const scenes = validImages.map((img, i) => {
          const label = labels[i];
          return {
            imageUrl: img.url,
            label,
            durationSec: getClipDuration(label),
            text: textByScene.get(i),
            motion: resolveMotionPreset(label, i),
          };
        });

        // Determine aspect ratio from channel
        const isVertical = ['instagram', 'tiktok', 'reels', 'stories'].some((ch) =>
          channel.toLowerCase().includes(ch),
        );
        const outputWidth = isVertical ? 1080 : 1920;
        const outputHeight = isVertical ? 1920 : 1080;

        // Dynamic import to keep bundle small
        const { composit } = await import('@/lib/video/videoCompositor');

        const webmBlob = await composit(
          {
            scenes,
            outputWidth,
            outputHeight,
            transitionDurationSec: 0.5,
            fps: 30,
            channel,
          },
          setProgress,
          ac.signal,
        );

        if (ac.signal.aborted) return;

        // Try MP4 conversion, fall back to WebM if SharedArrayBuffer unavailable
        let mp4Blob: Blob | null = null;
        const { canConvertToMp4 } = await import('@/lib/video/ffmpegBridge');
        if (canConvertToMp4()) {
          try {
            setPhase('converting');
            const { convertWebmToMp4 } = await import('@/lib/video/ffmpegBridge');
            mp4Blob = await convertWebmToMp4(webmBlob, setProgress);
          } catch (err) {
            console.warn('[VideoCompositor] MP4 conversion failed, using WebM:', err);
          }
        }

        if (ac.signal.aborted) return;

        const outputBlob = mp4Blob ?? webmBlob;
        const duration = scenes.reduce((sum, s) => sum + s.durationSec, 0);
        const compositorResult: CompositorResult = {
          webmBlob,
          mp4Blob: outputBlob,
          durationSec: duration,
          width: outputWidth,
          height: outputHeight,
        };

        const url = URL.createObjectURL(outputBlob);
        blobUrlRef.current = url;

        setResult(compositorResult);
        setPreviewUrl(url);
        setPhase('done');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[VideoCompositor] Error:', err);
        setError(err instanceof Error ? err.message : 'Smart Video creation failed');
        setPhase('error');
      }
    },
    [reset],
  );

  const generateFromConfig = useCallback(
    async (config: SmartVideoConfig, channel: string) => {
      reset();

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        setPhase('compositing');

        if (config.scenes.length < 1) {
          throw new Error('Need at least 1 scene to create a Smart Video');
        }

        // Build compositor scenes from config, applying motion style
        const scenes = config.scenes.map((s, i) => {
          const baseMotion = resolveMotionPreset(s.label, i);
          return {
            imageUrl: s.imageUrl,
            label: s.label,
            durationSec: s.durationSec,
            text: s.text,
            motion: applyMotionStyle(baseMotion, config.motionStyle),
          };
        });

        // Determine aspect ratio from channel
        const isVertical = ['instagram', 'tiktok', 'reels', 'stories'].some((ch) =>
          channel.toLowerCase().includes(ch),
        );
        const outputWidth = isVertical ? 1080 : 1920;
        const outputHeight = isVertical ? 1920 : 1080;

        const { composit } = await import('@/lib/video/videoCompositor');

        const webmBlob = await composit(
          {
            scenes,
            outputWidth,
            outputHeight,
            transitionDurationSec: config.transitionDurationSec,
            fps: 30,
            channel,
          },
          setProgress,
          ac.signal,
        );

        if (ac.signal.aborted) return;

        let mp4Blob: Blob | null = null;
        const { canConvertToMp4 } = await import('@/lib/video/ffmpegBridge');
        if (canConvertToMp4()) {
          try {
            setPhase('converting');
            const { convertWebmToMp4 } = await import('@/lib/video/ffmpegBridge');
            mp4Blob = await convertWebmToMp4(webmBlob, setProgress);
          } catch (err) {
            console.warn('[VideoCompositor] MP4 conversion failed, using WebM:', err);
          }
        }

        if (ac.signal.aborted) return;

        const outputBlob = mp4Blob ?? webmBlob;
        const duration = scenes.reduce((sum, s) => sum + s.durationSec, 0);
        const compositorResult: CompositorResult = {
          webmBlob,
          mp4Blob: outputBlob,
          durationSec: duration,
          width: outputWidth,
          height: outputHeight,
        };

        const url = URL.createObjectURL(outputBlob);
        blobUrlRef.current = url;

        setResult(compositorResult);
        setPreviewUrl(url);
        setPhase('done');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('[VideoCompositor] Error:', err);
        setError(err instanceof Error ? err.message : 'Smart Video creation failed');
        setPhase('error');
      }
    },
    [reset],
  );

  return { phase, progress, result, previewUrl, error, generate, generateFromConfig, abort, reset };
}
