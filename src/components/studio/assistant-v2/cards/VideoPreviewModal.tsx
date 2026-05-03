'use client';

import { useRef } from 'react';
import { X, RefreshCw, Download, Plus } from 'lucide-react';
import type { CompositorResult } from '@/lib/video/videoCompositor.types';

interface VideoPreviewModalProps {
  previewUrl: string;
  result: CompositorResult;
  onClose: () => void;
  onRegenerate: () => void;
  onAttach: () => void;
  isAttaching?: boolean;
  attachError?: string;
  /** When true, attach replaces images. When false, attach adds alongside images. */
  replaceImages?: boolean;
  onReplaceToggle?: (replace: boolean) => void;
}

export function VideoPreviewModal({
  previewUrl,
  result,
  onClose,
  onRegenerate,
  onAttach,
  isAttaching,
  attachError,
  replaceImages,
  onReplaceToggle,
}: VideoPreviewModalProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleDownload = () => {
    const a = linkRef.current;
    if (!a) return;
    a.href = previewUrl;
    const isMp4 = result.mp4Blob.type === 'video/mp4';
    a.download = `video-${Date.now()}.${isMp4 ? 'mp4' : 'webm'}`;
    a.click();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-sp-bg border border-white-10 hover:bg-white-10 transition-colors"
        >
          <X className="w-4 h-4 text-white-60" />
        </button>

        {/* Video player */}
        <video
          src={previewUrl}
          controls
          autoPlay
          loop
          className="max-w-full max-h-[70vh] rounded-lg"
        />

        {/* Info badge */}
        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sp-bg/90 border border-white-10 text-[10px] text-white-40">
          {result.width}×{result.height} · {result.durationSec.toFixed(1)}s ·{' '}
          {(result.mp4Blob.size / 1024 / 1024).toFixed(1)} MB
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-100 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Regenerate
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-100 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download {result.mp4Blob.type === 'video/mp4' ? 'MP4' : 'WebM'}
          </button>

          <button
            onClick={onAttach}
            disabled={isAttaching}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-surface hover:bg-accent-green-110/90 transition-colors disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            {isAttaching ? 'Attaching…' : 'Attach to Post'}
          </button>
        </div>

        {/* Replace vs keep toggle */}
        {onReplaceToggle && (
          <div className="mt-2 flex items-center gap-3">
            <button
              onClick={() => onReplaceToggle(true)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                replaceImages
                  ? 'bg-accent-green-110/10 text-accent-green-110 border border-accent-green-110/30'
                  : 'text-white-40 border border-white-10 hover:text-white-60'
              }`}
            >
              Use video instead of images
            </button>
            <button
              onClick={() => onReplaceToggle(false)}
              className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                !replaceImages
                  ? 'bg-accent-green-110/10 text-accent-green-110 border border-accent-green-110/30'
                  : 'text-white-40 border border-white-10 hover:text-white-60'
              }`}
            >
              Keep both
            </button>
          </div>
        )}

        {/* Attach error */}
        {attachError && (
          <p className="mt-2 text-[11px] text-accent-red text-center">{attachError}</p>
        )}

        {/* Hidden download link */}
        <a ref={linkRef} className="hidden" />
      </div>
    </div>
  );
}
