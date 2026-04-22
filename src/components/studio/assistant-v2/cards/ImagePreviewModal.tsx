'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Star,
  Sparkles,
  Eraser,
  Download,
  Loader2,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeImageQuality, type QualityResult } from '@/lib/imageQuality';
import { enhanceImageDetailed, type EnhanceResult } from '@/lib/imageQuality';
import { classifyImageType } from '@/lib/imageTypeClassifier';
import { cleanImage, type CleanResult } from '@/lib/overlayRemoval';

interface PreviewImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  tags?: string[];
  assetType?: 'image' | 'video';
  videoDurationSec?: number | null;
}

interface Props {
  image: PreviewImage;
  isHero: boolean;
  onHeroToggle: () => void;
  onClose: () => void;
}

type ActiveAction = 'enhance' | 'clean' | null;

export function ImagePreviewModal({ image, isHero, onHeroToggle, onClose }: Props) {
  const isVideo = image.assetType === 'video';
  const [quality, setQuality] = useState<QualityResult | null>(null);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  // Enhance state
  const [enhanceResult, setEnhanceResult] = useState<EnhanceResult | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

  // Clean state
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);

  // Preview toggle: 'original' | 'enhanced' | 'cleaned'
  const [previewMode, setPreviewMode] = useState<'original' | 'enhanced' | 'cleaned'>('original');

  const imageUrl = image.url || image.thumbnailUrl || '';

  // Compute quality on open (skip for video)
  useEffect(() => {
    if (!imageUrl || isVideo) return;
    let cancelled = false;
    setQualityLoading(true);
    computeImageQuality(imageUrl)
      .then((result) => {
        if (!cancelled) setQuality(result);
      })
      .catch(() => {
        // Quality analysis best-effort
      })
      .finally(() => {
        if (!cancelled) setQualityLoading(false);
      });
    return () => { cancelled = true; };
  }, [imageUrl, isVideo]);

  // Enhance handler
  const handleEnhance = useCallback(async () => {
    if (!imageUrl) return;
    setActiveAction('enhance');
    setEnhanceError(null);
    try {
      const classified = await classifyImageType(imageUrl);
      const result = await enhanceImageDetailed(imageUrl, { type: classified.type as any });
      setEnhanceResult(result);
      setPreviewMode('enhanced');
    } catch (err) {
      setEnhanceError('Enhancement failed');
    } finally {
      setActiveAction(null);
    }
  }, [imageUrl]);

  // Clean handler
  const handleClean = useCallback(async () => {
    if (!imageUrl) return;
    setActiveAction('clean');
    setCleanError(null);
    try {
      const result = await cleanImage(imageUrl);
      setCleanResult(result);
      if (result.removed) {
        setPreviewMode('cleaned');
      }
    } catch (err) {
      setCleanError('Cleanup failed');
    } finally {
      setActiveAction(null);
    }
  }, [imageUrl]);

  // Download handler
  const handleDownload = useCallback(() => {
    const url = previewMode === 'enhanced' && enhanceResult
      ? enhanceResult.dataUrl
      : previewMode === 'cleaned' && cleanResult?.removed
        ? cleanResult.dataUrl
        : imageUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = `image-${image.id}.jpg`;
    a.click();
  }, [previewMode, enhanceResult, cleanResult, imageUrl, image.id]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayUrl = previewMode === 'enhanced' && enhanceResult
    ? enhanceResult.dataUrl
    : previewMode === 'cleaned' && cleanResult?.removed
      ? cleanResult.dataUrl
      : imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative flex bg-sp-bg rounded-xl border border-white-10 shadow-2xl max-w-[700px] w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Media */}
        <div className="flex-1 min-w-0 bg-black flex items-center justify-center p-2">
          {isVideo ? (
            <video
              src={image.url}
              poster={image.thumbnailUrl || undefined}
              controls
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          ) : (
            <img
              src={displayUrl}
              alt=""
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          )}
        </div>

        {/* Right: Info panel */}
        <div className="w-[220px] flex-shrink-0 border-l border-white-10 p-3 overflow-y-auto space-y-3">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-md text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Video metadata panel */}
          {isVideo && (
            <div>
              <p className="text-[10px] font-medium text-white-60 uppercase tracking-wider mb-1.5">Video</p>
              <div className="flex items-center gap-1.5 text-xs text-white-60">
                <Film className="w-3 h-3" />
                {image.videoDurationSec != null ? (
                  <span>{Math.floor(image.videoDurationSec / 60)}:{String(Math.floor(image.videoDurationSec % 60)).padStart(2, '0')}</span>
                ) : (
                  <span>Video</span>
                )}
              </div>
            </div>
          )}

          {/* Quality panel (images only) */}
          {!isVideo && (
          <div>
            <p className="text-[10px] font-medium text-white-60 uppercase tracking-wider mb-1.5">Quality</p>
            {qualityLoading ? (
              <div className="flex items-center gap-1.5 text-[10px] text-white-40">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing...
              </div>
            ) : quality ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-bold tabular-nums',
                    quality.label === 'good' ? 'text-green-400' :
                    quality.label === 'fair' ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {quality.score}
                  </span>
                  <span className="text-[10px] text-white-40">/100</span>
                </div>
                <SignalBar label="Resolution" value={quality.signals.resolution} />
                <SignalBar label="Brightness" value={quality.signals.brightness} />
                <SignalBar label="Contrast" value={quality.signals.contrast} />
                <SignalBar label="Sharpness" value={quality.signals.sharpness} />
              </div>
            ) : (
              <p className="text-[10px] text-white-30">Unable to analyze</p>
            )}
          </div>
          )}

          {/* Tags */}
          {image.tags && image.tags.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-white-60 uppercase tracking-wider mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {image.tags.map((tag, i) => (
                  <span key={i} className="text-[9px] text-white-60 bg-white-5 border border-white-10 px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-white-60 uppercase tracking-wider">Actions</p>

            {/* Hero toggle (images only) */}
            {!isVideo && (
            <button
              onClick={onHeroToggle}
              className={cn(
                'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                isHero
                  ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                  : 'text-white-60 hover:text-white-100 hover:bg-white-5'
              )}
            >
              <Star className="w-3 h-3" fill={isHero ? 'currentColor' : 'none'} />
              {isHero ? 'Hero image' : 'Set as hero'}
            </button>
            )}

            {/* Enhance (images only) */}
            {!isVideo && (
            <button
              onClick={handleEnhance}
              disabled={activeAction !== null}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors disabled:opacity-50"
            >
              {activeAction === 'enhance' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {activeAction === 'enhance' ? 'Enhancing...' : enhanceResult ? 'Re-enhance' : 'Enhance'}
            </button>
            )}
            {!isVideo && enhanceResult && !enhanceResult.skippedReason && (
              <div className="flex gap-1 ml-5">
                <button
                  onClick={() => setPreviewMode('original')}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded',
                    previewMode === 'original' ? 'bg-white-10 text-white-80' : 'text-white-40 hover:text-white-60'
                  )}
                >
                  Before
                </button>
                <button
                  onClick={() => setPreviewMode('enhanced')}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded',
                    previewMode === 'enhanced' ? 'bg-white-10 text-white-80' : 'text-white-40 hover:text-white-60'
                  )}
                >
                  After
                </button>
              </div>
            )}
            {!isVideo && enhanceResult?.skippedReason && (
              <p className="text-[9px] text-white-30 ml-5">{enhanceResult.skippedReason}</p>
            )}
            {!isVideo && enhanceError && (
              <p className="text-[9px] text-red-400 ml-5">{enhanceError}</p>
            )}

            {/* Clean overlays (images only) */}
            {!isVideo && (
            <button
              onClick={handleClean}
              disabled={activeAction !== null}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors disabled:opacity-50"
            >
              {activeAction === 'clean' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Eraser className="w-3 h-3" />
              )}
              {activeAction === 'clean' ? 'Cleaning...' : cleanResult ? 'Re-clean' : 'Clean overlays'}
            </button>
            )}
            {!isVideo && cleanResult && (
              <p className="text-[9px] text-white-30 ml-5">
                {cleanResult.removed
                  ? `${cleanResult.overlays.filter(o => o.inpainted).length} overlay(s) removed · ${cleanResult.confidence} confidence`
                  : cleanResult.overlays.length > 0
                    ? `${cleanResult.overlays.length} detected but low confidence — original kept`
                    : 'No overlays detected'
                }
              </p>
            )}
            {!isVideo && cleanResult?.removed && (
              <div className="flex gap-1 ml-5">
                <button
                  onClick={() => setPreviewMode('original')}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded',
                    previewMode === 'original' ? 'bg-white-10 text-white-80' : 'text-white-40 hover:text-white-60'
                  )}
                >
                  Before
                </button>
                <button
                  onClick={() => setPreviewMode('cleaned')}
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded',
                    previewMode === 'cleaned' ? 'bg-white-10 text-white-80' : 'text-white-40 hover:text-white-60'
                  )}
                >
                  After
                </button>
              </div>
            )}
            {!isVideo && cleanError && (
              <p className="text-[9px] text-red-400 ml-5">{cleanError}</p>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-medium text-white-60 hover:text-white-100 hover:bg-white-5 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Signal Bar Sub-Component ──────────────────────────────────────────

function SignalBar({ label, value }: { label: string; value: number }) {
  const color = value >= 70 ? 'bg-green-400' : value >= 40 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-white-40 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-white-5 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[9px] text-white-40 tabular-nums w-5 text-right">{value}</span>
    </div>
  );
}
