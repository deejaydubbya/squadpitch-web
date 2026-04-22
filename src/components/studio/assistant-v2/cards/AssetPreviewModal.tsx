'use client';

import { useEffect } from 'react';
import { X, Video } from 'lucide-react';
import type { MediaAsset } from '@/hooks/useSquadpitch';

interface Props {
  asset: MediaAsset;
  onClose: () => void;
}

export function AssetPreviewModal({ asset, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isVideo = asset.assetType === 'video';
  const url = asset.url || asset.thumbnailUrl || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={onClose}>
      <div
        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-sp-bg border border-white-10 text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Media */}
        {isVideo ? (
          <video
            src={url}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-lg"
          />
        ) : (
          <img
            src={url}
            alt=""
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        )}

        {/* Filename badge */}
        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sp-bg/90 border border-white-10">
          {isVideo && <Video className="w-3 h-3 text-white-40" />}
          <span className="text-[10px] text-white-60 max-w-[300px] truncate">
            {asset.filename || asset.id}
          </span>
        </div>
      </div>
    </div>
  );
}
