'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Video, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useVideoCompositor, type VideoImageInput } from '@/hooks/useVideoCompositor';
import { useUploadAsset, useGeneratePersonaFrames, type MediaAsset, type PersonaFrameInput } from '@/hooks/useSquadpitch';
import { checkBrowserSupport } from '@/lib/video/ffmpegBridge';
import { CHANNEL_REGISTRY } from '@/lib/channelRegistry';
import type { Channel } from '@/hooks/useSquadpitch';
import type { SmartVideoConfig } from '@/lib/video/videoCompositor.types';
import { VideoPreviewModal } from './VideoPreviewModal';
import { SmartVideoControlModal } from './SmartVideoControlModal';

// Lifecycle status emitted to parents so they can render their own
// loading overlay / success banner near the post's media area
// rather than relying on the tiny button-only state.
export type SmartVideoUiPhase =
  | 'idle'
  | 'generating'
  | 'ready'
  | 'attaching'
  | 'done'
  | 'error';

export interface SmartVideoStatus {
  phase: SmartVideoUiPhase;
  /** Human-readable progress label (e.g. "Encoding video…") */
  message: string | null;
  /** Error string when phase === 'error' */
  error: string | null;
  /** True while the SmartVideoControlModal is open (don't dim media yet) */
  controlModalOpen: boolean;
}

interface VideoGeneratorButtonProps {
  images: VideoImageInput[];
  body: string;
  cta: string | null;
  channel: string;
  clientId: string;
  /**
   * Called when the uploaded video asset is attached to the post.
   * `replaceImages` reflects the Smart Video preview modal toggle —
   * when false, the parent should keep existing images and add the
   * video alongside; when true (default), the parent replaces the
   * media list with the video alone.
   */
  onAttached: (asset: MediaAsset, replaceImages: boolean) => void;
  /** Optional UI lifecycle callback for parents. */
  onStatusChange?: (status: SmartVideoStatus) => void;
  disabled?: boolean;
  /** 'compact' matches PostReviewItem, 'padded' matches QuickPostReviewInner */
  variant?: 'compact' | 'padded';
  /** If provided, the uploaded video is placed in this media library folder */
  folderId?: string | null;
}

export function VideoGeneratorButton({
  images,
  body,
  cta,
  channel,
  clientId,
  onAttached,
  onStatusChange,
  disabled,
  variant = 'compact',
  folderId,
}: VideoGeneratorButtonProps) {
  const { phase, progress, result, previewUrl, error, generate, generateFromConfig, abort, reset } =
    useVideoCompositor();
  const upload = useUploadAsset(clientId);
  const generatePersonaFramesMutation = useGeneratePersonaFrames(clientId);
  const [personaPhase, setPersonaPhase] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showControlModal, setShowControlModal] = useState(false);
  const [attachSuccess, setAttachSuccess] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [replaceImages, setReplaceImages] = useState(true);
  const [browserSupported, setBrowserSupported] = useState(true);
  const autoTriggered = useRef(false);

  useEffect(() => {
    const { supported } = checkBrowserSupport();
    setBrowserSupported(supported);
  }, []);

  // Emit a single UI lifecycle status whenever any of the underlying
  // signals change. Parents render the loading overlay / success
  // banner from this — keeps the button itself simple and gives the
  // user real feedback in the media area.
  useEffect(() => {
    if (!onStatusChange) return;
    const isAttachingNow = upload.isPending;
    const message = personaPhase || progress?.message || null;
    let next: SmartVideoStatus;
    if (attachError) {
      next = { phase: 'error', message: null, error: attachError, controlModalOpen: showControlModal };
    } else if (error && phase === 'error') {
      next = { phase: 'error', message: null, error, controlModalOpen: showControlModal };
    } else if (attachSuccess) {
      next = { phase: 'done', message: null, error: null, controlModalOpen: false };
    } else if (isAttachingNow) {
      next = { phase: 'attaching', message: 'Attaching to post…', error: null, controlModalOpen: false };
    } else if (phase === 'compositing' || phase === 'converting' || !!personaPhase) {
      next = { phase: 'generating', message: message ?? 'Creating Smart Video…', error: null, controlModalOpen: false };
    } else if (phase === 'done') {
      next = { phase: 'ready', message: 'Smart Video ready — preview to attach', error: null, controlModalOpen: false };
    } else {
      next = { phase: 'idle', message: null, error: null, controlModalOpen: showControlModal };
    }
    onStatusChange(next);
  }, [onStatusChange, phase, progress, personaPhase, upload.isPending, attachError, attachSuccess, error, showControlModal]);

  const canGenerate = browserSupported && images.length >= 1 && !disabled;

  // Auto-trigger for channels that require or prefer video (YouTube, TikTok)
  useEffect(() => {
    if (autoTriggered.current || phase !== 'idle' || !canGenerate) return;
    const reg = CHANNEL_REGISTRY[channel as Channel];
    if (reg && (reg.requiresVideo || reg.prefersVideo)) {
      autoTriggered.current = true;
      generate(images, body, cta, channel);
    }
  }, [channel, phase, canGenerate, generate, images, body, cta]);

  const handleClick = useCallback(() => {
    if (phase === 'done') {
      setShowModal(true);
    } else if (phase === 'idle' || phase === 'error') {
      setAttachError(null);
      setAttachSuccess(false);
      setShowControlModal(true);
    }
  }, [phase]);

  const handleConfiguredGenerate = useCallback(
    async (config: SmartVideoConfig) => {
      setShowControlModal(false);

      let enrichedConfig = config;

      // Generate persona frames if requested
      if (config.personaFrames && (config.personaFrames.intro || config.personaFrames.outro || config.personaFrames.thumbnail)) {
        try {
          setPersonaPhase('Generating persona frames...');

          const frameRequests: PersonaFrameInput[] = [];
          if (config.personaFrames.intro) frameRequests.push({ purpose: 'intro' });
          if (config.personaFrames.outro) frameRequests.push({ purpose: 'outro' });
          if (config.personaFrames.thumbnail) frameRequests.push({ purpose: 'thumbnail' });

          const { frames } = await generatePersonaFramesMutation.mutateAsync({ frames: frameRequests });

          const introFrame = frames.find((f) => f.purpose === 'intro');
          const outroFrame = frames.find((f) => f.purpose === 'outro');

          const enrichedScenes = [...config.scenes];

          if (introFrame) {
            const hookText = config.scenes[0]?.text;
            enrichedScenes.unshift({
              imageUrl: introFrame.url,
              label: 'other',
              durationSec: 3.0,
              text: hookText,
              textRole: 'hook',
              confidence: 100,
              tags: ['persona-intro'],
            });
          }

          if (outroFrame) {
            const lastScene = config.scenes[config.scenes.length - 1];
            enrichedScenes.push({
              imageUrl: outroFrame.url,
              label: 'other',
              durationSec: 3.0,
              text: cta || lastScene?.text || 'Get in touch',
              textRole: 'cta',
              confidence: 100,
              tags: ['persona-outro'],
            });
          }

          enrichedConfig = { ...config, scenes: enrichedScenes };
        } catch (err) {
          console.error('[VideoGenerator] Persona frame generation failed, proceeding without:', err);
        } finally {
          setPersonaPhase(null);
        }
      }

      generateFromConfig(enrichedConfig, channel);
    },
    [generateFromConfig, generatePersonaFramesMutation, channel, cta],
  );

  const handleRegenerate = useCallback(() => {
    setShowModal(false);
    reset();
    setTimeout(() => setShowControlModal(true), 50);
  }, [reset]);

  const handleAttach = useCallback(async () => {
    if (!result) return;
    setAttachError(null);
    // Normalize MIME type — MediaRecorder produces 'video/webm;codecs=vp9' which backends reject
    const isMp4 = result.mp4Blob.type.startsWith('video/mp4');
    const mimeType = isMp4 ? 'video/mp4' : 'video/webm';
    const ext = isMp4 ? 'mp4' : 'webm';
    const file = new File([result.mp4Blob], `video-${Date.now()}.${ext}`, { type: mimeType });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const asset = await upload.mutateAsync({ formData, assetType: 'video', folderId: folderId ?? undefined });
      // replaceImages comes from the toggle in VideoPreviewModal. When
      // false, the parent should append the video to its current media
      // list rather than wiping it. Previously this flag was set in
      // state but never read — silent UX bug.
      onAttached(asset, replaceImages);
      setShowModal(false);
      setAttachSuccess(true);
      setTimeout(() => setAttachSuccess(false), 3000);
    } catch (err) {
      console.error('[VideoGenerator] Upload failed:', err);
      setAttachError("Couldn't attach Smart Video. Try again or download it.");
    }
  }, [result, upload, onAttached, folderId, replaceImages]);

  const isLoading = phase === 'compositing' || phase === 'converting' || !!personaPhase;
  const isDisabled = disabled || !browserSupported || images.length < 1;

  // Styling based on variant
  const buttonClass =
    variant === 'compact'
      ? 'flex items-center gap-0.5 text-[10px] text-white-40 hover:text-white-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
      : 'flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const iconSize = variant === 'compact' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isDisabled || isLoading}
        className={buttonClass}
        title={
          !browserSupported
            ? 'Browser does not support Smart Video'
            : images.length < 1
              ? 'Assign at least 1 image to create a Smart Video'
              : undefined
        }
      >
        {phase === 'idle' && (
          <>
            <Video className={iconSize} />
            Create Smart Video
          </>
        )}
        {isLoading && (
          <>
            <Loader2 className={`${iconSize} animate-spin`} />
            {personaPhase || progress?.message || 'Creating Smart Video…'}
          </>
        )}
        {phase === 'done' && (
          <>
            <CheckCircle2 className={`${iconSize} text-accent-green-110`} />
            Smart Video Ready
          </>
        )}
        {phase === 'error' && (
          <>
            <AlertCircle className={`${iconSize} text-accent-red`} />
            Smart Video Failed – Retry
          </>
        )}
      </button>

      {/* Inline attach feedback */}
      {attachSuccess && (
        <span className="text-[10px] text-accent-green-110 ml-1">Smart Video attached to post</span>
      )}
      {attachError && (
        <span className="text-[10px] text-accent-red ml-1">{attachError}</span>
      )}

      {/* Control modal — opens before generation */}
      {showControlModal && (
        <SmartVideoControlModal
          images={images}
          body={body}
          cta={cta}
          channel={channel}
          clientId={clientId}
          onGenerate={handleConfiguredGenerate}
          onClose={() => setShowControlModal(false)}
          isGenerating={isLoading}
        />
      )}

      {/* Preview modal — opens after generation */}
      {showModal && previewUrl && result && (
        <VideoPreviewModal
          previewUrl={previewUrl}
          result={result}
          onClose={() => setShowModal(false)}
          onRegenerate={handleRegenerate}
          onAttach={handleAttach}
          isAttaching={upload.isPending}
          attachError={attachError ?? undefined}
          replaceImages={replaceImages}
          onReplaceToggle={setReplaceImages}
        />
      )}
    </>
  );
}
