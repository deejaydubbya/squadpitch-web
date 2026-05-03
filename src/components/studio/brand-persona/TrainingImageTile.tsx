'use client';

import { X, CheckCircle } from 'lucide-react';
import type { PersonaTrainingImage } from '@/hooks/useSquadpitch';

interface Props {
  image: PersonaTrainingImage;
  onRemove?: (id: string) => void;
  removing?: boolean;
}

export function TrainingImageTile({ image, onRemove, removing }: Props) {
  return (
    <div className="relative group rounded-lg overflow-hidden bg-white-5 aspect-square">
      <img
        src={image.url}
        alt={image.filename || 'Training image'}
        className="w-full h-full object-cover"
      />

      {/* Quality badge */}
      <div className="absolute top-1.5 left-1.5">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-600/80 text-[9px] font-medium text-white">
          <CheckCircle className="w-2.5 h-2.5" />
          Good
        </span>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          onClick={() => onRemove(image.id)}
          disabled={removing}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white-80 hover:bg-red-600 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Filename */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1">
        <p className="text-[9px] text-white/70 truncate">{image.filename || 'Image'}</p>
      </div>
    </div>
  );
}
