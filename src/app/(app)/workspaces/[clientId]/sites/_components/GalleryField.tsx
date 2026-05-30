'use client';

import { useState } from 'react';
import { Image as ImageIcon, Plus, X as XIcon } from 'lucide-react';
import { MediaPickerModal, type MediaPickerSelection } from '@/components/studio/MediaPickerModal';
import { cn } from '@/lib/utils';

// Sites-03 — multi-image picker for the gallery block. Thumbnail
// grid + Add / Remove. Always persists imageUrls[] (back-compat
// with the public renderer); the imageId-bearing additions get
// dropped if the underlying block schema doesn't support them.

interface Props {
  clientId: string;
  imageUrls: string[];
  onChange: (next: string[]) => void;
  propertyImages?: string[];
}

export function GalleryField({ clientId, imageUrls, onChange, propertyImages }: Props) {
  const [picker, setPicker] = useState(false);

  const handlePick = (items: MediaPickerSelection[]) => {
    const seen = new Set(imageUrls);
    const additions: string[] = [];
    for (const it of items) {
      if (!seen.has(it.url)) {
        additions.push(it.url);
        seen.add(it.url);
      }
    }
    if (additions.length > 0) onChange([...imageUrls, ...additions]);
  };

  const remove = (url: string) => onChange(imageUrls.filter((u) => u !== url));

  return (
    <div className="space-y-2" data-testid="gallery-field">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setPicker(true)}
          data-testid="gallery-field-add"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add images
        </button>
        <span className="text-[11px] text-white-40">
          {imageUrls.length === 0
            ? 'No images yet.'
            : `${imageUrls.length} image${imageUrls.length === 1 ? '' : 's'}`}
        </span>
      </div>

      {imageUrls.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white-15 bg-white-3 p-6 text-center text-xs text-white-40">
          <ImageIcon className="w-5 h-5 mx-auto mb-1.5 text-white-30" />
          Add property photos, library images, or paste URLs.
        </div>
      ) : (
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
          {imageUrls.map((url) => (
            <div
              key={url}
              className={cn(
                'relative rounded-md overflow-hidden aspect-square border border-white-10 group',
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                data-testid="gallery-field-remove"
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                aria-label="Remove image"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {picker && (
        <MediaPickerModal
          clientId={clientId}
          mode="multi"
          propertyImages={propertyImages}
          existingUrls={imageUrls}
          onClose={() => setPicker(false)}
          onSelect={handlePick}
        />
      )}
    </div>
  );
}
