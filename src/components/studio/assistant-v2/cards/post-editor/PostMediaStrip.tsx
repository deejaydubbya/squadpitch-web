'use client';

import { AlertCircle, Images, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveThumbUrl } from '@/lib/assistant/media/resolveThumb';
import type { PostMediaStripProps } from './types';

export function PostMediaStrip({
  mediaIds,
  assetMap,
  propertyImages,
  itemImages,
  maxVisible = 6,
  thumbSize = 'md',
  onRemove,
  onPreview,
  onTogglePicker,
  emptyLabel = 'No media attached',
}: PostMediaStripProps) {
  const sizeClasses = thumbSize === 'sm'
    ? 'w-8 h-8 rounded border'
    : 'w-14 h-14 rounded-lg border';

  const iconSize = thumbSize === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';
  const idSlice = thumbSize === 'sm' ? 8 : 12;
  const idTextSize = thumbSize === 'sm' ? 'text-[5px]' : 'text-[6px]';
  const maxWidth = thumbSize === 'sm' ? 'max-w-[28px]' : 'max-w-[50px]';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
            Attached Media
          </label>
          {mediaIds.length > 1 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-purple-400 bg-purple-500/15 px-1.5 py-px rounded-full">
              <Images className="w-2.5 h-2.5" />
              Carousel
            </span>
          )}
        </div>
        <button
          onClick={onTogglePicker}
          className="text-[11px] font-medium text-accent-green-110 hover:underline"
        >
          {mediaIds.length > 0 ? 'Change' : 'Add media'}
        </button>
      </div>
      {mediaIds.length > 0 ? (
        <div className={cn('flex gap-1.5 overflow-x-auto', thumbSize === 'md' && 'pb-1')}>
          {mediaIds.slice(0, maxVisible).map((id) => {
            const resolved = resolveThumbUrl(id, assetMap, propertyImages, itemImages);
            const asset = assetMap.get(id);
            return (
              <div
                key={id}
                className={cn(
                  sizeClasses,
                  'relative border-white-10 bg-white-5 flex-shrink-0 overflow-hidden group',
                )}
              >
                <button
                  type="button"
                  onClick={() => asset && onPreview(asset)}
                  className="w-full h-full"
                >
                  {/* Fallback */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                    <AlertCircle className={cn(iconSize, 'text-accent-red/60')} />
                    <span className={cn(idTextSize, 'text-white-30 truncate', maxWidth)}>
                      {id.slice(0, idSlice)}
                    </span>
                  </div>
                  {resolved.url && (
                    // For videos, render a <video> with preload="metadata"
                    // so the browser shows the first frame as poster.
                    // <img> can't render an .mp4 — if the backend didn't
                    // generate a separate thumbnail jpg (or it's
                    // missing), the <img> errors out and the fallback
                    // alert-circle icon shows instead. Using <video>
                    // here works regardless of whether the URL is the
                    // raw video or a derived poster.
                    resolved.isVideo ? (
                      <video
                        src={resolved.url}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLVideoElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <img
                        src={resolved.url}
                        alt={resolved.label}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )
                  )}
                  {resolved.isVideo && (
                    thumbSize === 'sm' ? (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[7px] text-white text-center leading-tight z-10">
                        VID
                      </span>
                    ) : (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 flex items-center justify-center py-0.5">
                        <Video className="w-2.5 h-2.5 text-white" />
                      </div>
                    )
                  )}
                </button>
                {onRemove && (
                  <button
                    onClick={() => onRemove(id)}
                    className={cn(
                      'absolute top-0.5 right-0.5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity',
                      thumbSize === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
                    )}
                  >
                    <X className={thumbSize === 'sm' ? 'w-2 h-2 text-white' : 'w-2.5 h-2.5 text-white'} />
                  </button>
                )}
              </div>
            );
          })}
          {mediaIds.length > maxVisible && (
            <div
              className={cn(
                sizeClasses,
                'border-white-10 bg-white-5 flex-shrink-0 flex items-center justify-center',
              )}
            >
              <span className="text-[10px] text-white-40 font-medium">
                +{mediaIds.length - maxVisible}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-white-30 italic">{emptyLabel}</p>
      )}
    </div>
  );
}
