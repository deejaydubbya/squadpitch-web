'use client';

import { ImagePlus } from 'lucide-react';
import { MIN_TRAINING_IMAGES } from './personaConstants';
import { TrainingImageTile } from './TrainingImageTile';
import type { PersonaTrainingImage } from '@/hooks/useSquadpitch';

interface Props {
  images: PersonaTrainingImage[];
  onRemove: (id: string) => void;
  removing: boolean;
  onAddMore: () => void;
  onContinue: () => void;
}

export function ReviewTrainingStep({
  images,
  onRemove,
  removing,
  onAddMore,
  onContinue,
}: Props) {
  const readiness = Math.min(100, Math.round((images.length / MIN_TRAINING_IMAGES) * 86));
  const canContinue = images.length >= MIN_TRAINING_IMAGES;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white-100">
          Review Training Set
        </h2>
        <p className="text-sm text-white-40 mt-1">
          Check your images below. Remove any low-quality photos and add more if needed.
        </p>
      </div>

      {/* Readiness score */}
      <div className="rounded-lg bg-white-5 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white-100">
            Persona readiness: {readiness}%
          </p>
          <p className="text-xs text-white-40 mt-0.5">
            {images.length} images &middot;{' '}
            {canContinue ? 'Ready to train' : `Need ${MIN_TRAINING_IMAGES - images.length} more`}
          </p>
        </div>
        <div className="w-24 h-2 rounded-full bg-white-10 overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-green-110 transition-all"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>

      {/* Image grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {images.map((img) => (
          <TrainingImageTile
            key={img.id}
            image={img}
            onRemove={onRemove}
            removing={removing}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button onClick={onAddMore} className="btn btn-ghost text-sm px-4 py-2">
          <ImagePlus className="w-4 h-4 mr-1.5 inline" />
          Add More Photos
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="btn btn-primary px-6 py-2 text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
