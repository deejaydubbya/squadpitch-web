'use client';

import { RefreshCw, Edit3, Save, Loader2 } from 'lucide-react';
import { PREVIEW_LABELS } from './personaConstants';
import type { PersonaPreviewImage, PersonaTrainingImage } from '@/hooks/useSquadpitch';

interface Props {
  previewImages: PersonaPreviewImage[] | null;
  trainingImages: PersonaTrainingImage[];
  onRegenerate: () => void;
  regenerating: boolean;
  onEditTraining: () => void;
  onContinue: () => void;
}

export function PreviewResultsStep({
  previewImages,
  trainingImages,
  onRegenerate,
  regenerating,
  onEditTraining,
  onContinue,
}: Props) {
  const hasRealPreviews = previewImages && previewImages.length > 0;

  // Build display list: use real previews if available, otherwise training images as placeholders
  const displayItems = hasRealPreviews
    ? previewImages.map((p, i) => ({
        label: PREVIEW_LABELS[i] || `Preview ${i + 1}`,
        url: p.url,
        isReal: true,
      }))
    : PREVIEW_LABELS.map((label, i) => ({
        label,
        url: trainingImages[i % trainingImages.length]?.url,
        isReal: false,
      }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white-100">Preview Results</h2>
        <p className="text-sm text-white-40 mt-1">
          {hasRealPreviews
            ? 'Here are sample images generated with your AI Brand Persona.'
            : 'Preview images are being prepared. Here are placeholder previews from your training photos.'}
        </p>
      </div>

      {/* Preview grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {displayItems.map((preview) => (
          <div key={preview.label} className="space-y-1.5">
            <div className="aspect-square rounded-lg overflow-hidden bg-white-5 relative">
              {preview.url ? (
                <img
                  src={preview.url}
                  alt={preview.label}
                  className={`w-full h-full object-cover ${!preview.isReal ? 'opacity-60' : ''}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white-20 text-xs">
                  Preview
                </div>
              )}
              {!preview.isReal && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              )}
              {preview.isReal && (
                <div className="absolute top-1.5 left-1.5">
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-accent-green-110/80 text-white font-medium">
                    AI Generated
                  </span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-white-40 text-center">{preview.label}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="btn btn-ghost text-xs px-3 py-1.5"
          >
            {regenerating ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 inline animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 inline" />
            )}
            {regenerating ? 'Generating...' : 'Regenerate'}
          </button>
          <button
            onClick={onEditTraining}
            className="btn btn-ghost text-xs px-3 py-1.5"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5 inline" />
            Edit Training Photos
          </button>
        </div>
        <button onClick={onContinue} className="btn btn-primary px-6 py-2 text-sm">
          <Save className="w-4 h-4 mr-1.5 inline" />
          Looks Good
        </button>
      </div>
    </div>
  );
}
