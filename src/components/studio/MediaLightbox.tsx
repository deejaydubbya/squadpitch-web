'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GalleryItem {
  url: string;
  type: 'image' | 'video';
}

interface Props {
  url: string;
  type: 'image' | 'video' | null;
  alt?: string;
  onClose: () => void;
  /** When provided, enables gallery mode with left/right navigation */
  gallery?: GalleryItem[];
}

export function MediaLightbox({ url, type, alt, onClose, gallery }: Props) {
  const [index, setIndex] = useState(0);

  const items: GalleryItem[] = gallery ?? [{ url, type: type ?? 'image' }];
  const current = items[index] ?? items[0];
  const hasNext = index < items.length - 1;
  const hasPrev = index > 0;

  const goNext = useCallback(() => { if (hasNext) setIndex((i) => i + 1); }, [hasNext]);
  const goPrev = useCallback(() => { if (hasPrev) setIndex((i) => i - 1); }, [hasPrev]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs tabular-nums z-10">
          {index + 1} / {items.length}
        </div>
      )}

      {/* Prev */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Next */}
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      <div
        className="max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === 'video' ? (
          <video
            key={current.url}
            src={current.url}
            controls
            autoPlay
            className="max-w-full max-h-[90vh] rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.url}
            src={current.url}
            alt={alt || `Media ${index + 1}`}
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
          />
        )}
      </div>
    </div>
  );
}
