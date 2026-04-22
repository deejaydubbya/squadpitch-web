import { X, Star, ImageIcon, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectableImage } from './types';

interface SelectionStripProps {
  allImages: SelectableImage[];
  selected: Set<string>;
  heroId: string | null;
  onRemove: (id: string) => void;
  onToggleHero: (id: string) => void;
}

export function SelectionStrip({
  allImages,
  selected,
  heroId,
  onRemove,
  onToggleHero,
}: SelectionStripProps) {
  if (selected.size === 0) return null;

  const selectedImages = allImages.filter((img) => selected.has(img.id));

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
        {selected.size} selected
      </p>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {selectedImages.map((img) => {
          const isVideo = img.assetType === 'video';
          return (
          <div
            key={img.id}
            className="relative flex-shrink-0 w-10 h-10 rounded-md border border-accent-green-110/40 overflow-hidden group"
          >
            {img.thumbnailUrl || img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.thumbnailUrl || img.url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white-5 flex items-center justify-center">
                {isVideo ? (
                  <Film className="w-3 h-3 text-white-20" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-white-20" />
                )}
              </div>
            )}

            {/* Video badge */}
            {isVideo && (
              <div className="absolute top-0 left-0 p-0.5 bg-black/70 rounded-br">
                <Film className="w-2 h-2 text-white/70" />
              </div>
            )}

            {/* Remove button */}
            <button
              onClick={() => onRemove(img.id)}
              className="absolute top-0 right-0 p-0.5 bg-black/70 rounded-bl text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove"
            >
              <X className="w-2.5 h-2.5" />
            </button>

            {/* Hero star (images only) */}
            {!isVideo && (
            <button
              onClick={() => onToggleHero(img.id)}
              className={cn(
                'absolute bottom-0 left-0 p-0.5 rounded-tr transition-colors',
                heroId === img.id
                  ? 'text-yellow-400 bg-black/70'
                  : 'text-white/40 bg-black/50 opacity-0 group-hover:opacity-100'
              )}
              title={heroId === img.id ? 'Remove as hero' : 'Set as hero'}
            >
              <Star
                className="w-2.5 h-2.5"
                fill={heroId === img.id ? 'currentColor' : 'none'}
              />
            </button>
            )}

            {/* Hero indicator */}
            {heroId === img.id && (
              <div className="absolute top-0 left-0 w-full h-0.5 bg-yellow-400" />
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
