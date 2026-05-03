'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MIN_TRAINING_IMAGES,
  MAX_TRAINING_IMAGES,
  PHOTO_GUIDELINES,
  BRAND_STYLE_PHOTO_GUIDELINES,
} from './personaConstants';
import type { PersonaType } from '@/hooks/useSquadpitch';
import { TrainingImageTile } from './TrainingImageTile';
import type { PersonaTrainingImage } from '@/hooks/useSquadpitch';

interface Props {
  images: PersonaTrainingImage[];
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  uploading: boolean;
  removing: boolean;
  onContinue: () => void;
  personaType?: PersonaType;
}

export function UploadTrainingStep({
  images,
  onUpload,
  onRemove,
  uploading,
  removing,
  onContinue,
  personaType,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const canContinue = images.length >= MIN_TRAINING_IMAGES;
  const isBrandStyle = personaType === 'BRAND_STYLE';
  const guidelines = isBrandStyle ? BRAND_STYLE_PHOTO_GUIDELINES : PHOTO_GUIDELINES;

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const remaining = MAX_TRAINING_IMAGES - images.length;
      const toUpload = Array.from(files).slice(0, remaining);
      toUpload.forEach((f) => onUpload(f));
    },
    [images.length, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white-100">
          {isBrandStyle ? 'Upload Brand Examples' : 'Upload Training Images'}
        </h2>
        <p className="text-sm text-white-40 mt-1">
          {isBrandStyle
            ? `Upload ${MIN_TRAINING_IMAGES}\u2013${MAX_TRAINING_IMAGES} examples of your brand's visual style — graphics, flyers, social posts.`
            : <>Upload {MIN_TRAINING_IMAGES}&ndash;{MAX_TRAINING_IMAGES} photos to train your AI Brand Persona. The more variety, the better.</>}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
          dragOver
            ? 'border-accent-green-110 bg-accent-green-110/5'
            : 'border-white-15 hover:border-white-25',
          images.length >= MAX_TRAINING_IMAGES && 'opacity-50 pointer-events-none'
        )}
      >
        <Upload className="w-8 h-8 text-white-30 mx-auto mb-3" />
        <p className="text-sm text-white-60 mb-2">
          Drag & drop photos here, or click to browse
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || images.length >= MAX_TRAINING_IMAGES}
          className="btn btn-primary text-xs px-4 py-1.5"
        >
          <ImagePlus className="w-3.5 h-3.5 mr-1.5 inline" />
          {uploading ? 'Uploading...' : 'Choose Photos'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white-40">
          {images.length} of {MIN_TRAINING_IMAGES}&ndash;{MAX_TRAINING_IMAGES} photos
        </span>
        {!canContinue && images.length > 0 && (
          <span className="text-xs text-accent-orange">
            Need at least {MIN_TRAINING_IMAGES - images.length} more
          </span>
        )}
      </div>

      {/* Image grid */}
      {images.length > 0 && (
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
      )}

      {/* Guidelines */}
      <div className="rounded-lg bg-white-5 p-4">
        <h4 className="text-xs font-semibold text-white-60 mb-2">
          Photo Guidelines
        </h4>
        <ul className="space-y-1">
          {guidelines.map((g) => (
            <li key={g} className="text-xs text-white-40 flex items-start gap-2">
              <span className="text-accent-green-110 mt-0.5">&#8226;</span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      {/* Continue */}
      <div className="flex justify-end">
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
