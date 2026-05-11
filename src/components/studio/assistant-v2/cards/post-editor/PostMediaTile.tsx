import { Check, ImageIcon, Loader2, Video } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MediaAsset } from '@/hooks/useSquadpitch';
import { resolveThumbUrl } from '@/lib/assistant/media/resolveThumb';
import { BADGE_COLORS, resolveMediaBadge, type PostMediaBadge } from './PostMediaSelector.types';

type PropertyImageEntry = string | { url?: string; src?: string; imageUrl?: string; label?: string };

interface PostMediaTileProps {
  id: string;
  assetMap: Map<string, MediaAsset>;
  propertyImages?: PropertyImageEntry[];
  itemImages?: Array<string | { url?: string; label?: string }>;
  suggestedIds: Set<string>;
  selected: boolean;
  showBadge?: boolean;
  onClick: () => void;
}

export function PostMediaTile({
  id,
  assetMap,
  propertyImages,
  itemImages,
  suggestedIds,
  selected,
  showBadge = true,
  onClick,
}: PostMediaTileProps) {
  const resolved = resolveThumbUrl(id, assetMap, propertyImages, itemImages);
  const asset = assetMap.get(id);
  const isPending = asset?.status === 'GENERATING' || asset?.status === 'PENDING';
  const badge: PostMediaBadge = resolveMediaBadge(id, assetMap, suggestedIds);

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative aspect-square rounded border overflow-hidden transition-colors',
        selected
          ? 'border-accent-green-110 ring-1 ring-accent-green-110/40'
          : 'border-white-10 hover:border-white-20',
      )}
    >
      {/* Fallback */}
      <div className="absolute inset-0 bg-white-5 flex items-center justify-center">
        <ImageIcon className="w-3 h-3 text-white-20" />
      </div>

      {/* Thumbnail — use <video> for video assets so the browser
          renders the first frame as poster (an <img> can't display
          an .mp4 and would error out to the fallback icon). */}
      {resolved.url && (
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
          // eslint-disable-next-line @next/next/no-img-element
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

      {/* Pending spinner overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        </div>
      )}

      {/* Video indicator */}
      {resolved.isVideo && !isPending && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 flex items-center justify-center py-0.5">
          <Video className="w-2 h-2 text-white" />
        </div>
      )}

      {/* Source badge (top-right) */}
      {showBadge && !isPending && (
        <span
          className={cn(
            'absolute top-0.5 right-0.5 px-1 py-px rounded text-[7px] font-medium leading-tight',
            BADGE_COLORS[badge],
          )}
        >
          {badge}
        </span>
      )}

      {/* Selected checkmark (bottom-right) */}
      {selected && (
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-accent-green-110 flex items-center justify-center rounded-tl">
          <Check className="w-2 h-2 text-sp-surface" />
        </div>
      )}
    </button>
  );
}
