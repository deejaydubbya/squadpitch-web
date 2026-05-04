import { ImageIcon, Star, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectableImage } from './types';

interface ImageTileProps {
  image: SelectableImage;
  isSelected: boolean;
  isHero: boolean;
  onToggle: (id: string) => void;
  onHeroToggle: (id: string) => void;
  onPreview: (img: SelectableImage) => void;
  priorityScore: number | null;
}

export function ImageTile({
  image,
  isSelected,
  isHero,
  onToggle,
  onHeroToggle,
  onPreview,
  priorityScore,
}: ImageTileProps) {
  const score = image.qualityScore ?? priorityScore;
  const tags = image.tags ?? [];

  return (
    <div
      className={cn(
        'relative aspect-square rounded-lg border overflow-hidden transition-colors group',
        isSelected
          ? 'border-accent-green-110 ring-2 ring-accent-green-110/40'
          : 'border-white-10 hover:border-white-20'
      )}
    >
      {/* Image body — click toggles selection */}
      <button
        onClick={() => onToggle(image.id)}
        className="w-full h-full"
      >
        {image.thumbnailUrl || image.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image.thumbnailUrl || image.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-white-5 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-white-20" />
          </div>
        )}
      </button>

      {/* Hero star (top-left) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onHeroToggle(image.id);
        }}
        className={cn(
          'absolute top-0.5 left-0.5 p-0.5 rounded transition-colors',
          isHero
            ? 'text-yellow-400'
            : 'text-white/40 opacity-0 group-hover:opacity-100'
        )}
        title={isHero ? 'Remove as cover photo' : 'Set as cover photo'}
      >
        <Star className="w-3.5 h-3.5" fill={isHero ? 'currentColor' : 'none'} />
      </button>

      {/* Preview button (bottom-left) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPreview(image);
        }}
        className="absolute bottom-0.5 left-0.5 p-0.5 rounded bg-black/50 text-white/60 hover:text-white hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all"
        title="Preview"
      >
        <Eye className="w-3 h-3" />
      </button>

      {/* Score badge (top-right) */}
      {score != null && (
        <div
          className={cn(
            'absolute top-0.5 right-0.5 flex items-center gap-0.5 px-1 py-[1px] rounded text-[8px] font-bold tabular-nums',
            score >= 70 ? 'bg-green-500/90 text-white' :
            score >= 40 ? 'bg-yellow-500/90 text-black' : 'bg-red-500/90 text-white'
          )}
          title={`Quality: ${Math.round(score)}/100`}
        >
          {Math.round(score)}
        </div>
      )}

      {/* Hero badge */}
      {isHero && (
        <div className="absolute top-0.5 left-5 px-1 py-[1px] rounded bg-yellow-400/90 text-[7px] font-bold text-black uppercase tracking-wider">
          Cover
        </div>
      )}

      {/* Tags (bottom overlay) */}
      {tags.length > 0 && (
        <div className="absolute bottom-5 left-0 right-0 px-1 py-0.5 bg-black/70 flex items-center gap-0.5 overflow-hidden">
          {tags.slice(0, 2).map((tag, i) => (
            <span key={i} className="text-[9px] text-white font-medium bg-white/15 px-1.5 py-[1px] rounded truncate">
              {tag}
            </span>
          ))}
          {tags.length > 2 && (
            <span className="text-[9px] text-white/70 font-medium">+{tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Selection checkbox (bottom-right corner) — always visible */}
      <div
        className={cn(
          'absolute bottom-0.5 right-0.5 w-4 h-4 rounded border flex items-center justify-center pointer-events-none',
          isSelected
            ? 'bg-accent-green-110 border-accent-green-110'
            : 'bg-black/40 border-white/30'
        )}
      >
        {isSelected && (
          <svg className="w-2.5 h-2.5 text-sp-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Selected overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-accent-green-110/10 pointer-events-none" />
      )}
    </div>
  );
}
