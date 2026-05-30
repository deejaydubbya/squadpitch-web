'use client';

import { useState } from 'react';
import { Image as ImageIcon, X as XIcon } from 'lucide-react';
import { MediaPickerModal, type MediaPickerSelection } from '@/components/studio/MediaPickerModal';
import { cn } from '@/lib/utils';

// Sites-03 — single-image field used by hero / image / testimonial
// blocks. Thumbnail preview + Choose / Replace / Remove + URL
// paste fallback. Always writes the URL so the public renderer
// (which only reads imageUrl) keeps working; optionally returns
// the imageId so future signed-URL flows can use it.

export interface ImageFieldValue {
  imageUrl: string | null;
  imageId?: string | null;
}

interface Props {
  clientId: string;
  label?: string;
  value: ImageFieldValue;
  onChange: (next: ImageFieldValue) => void;
  /** Pass the source property's photo URLs to enable the Property Photos tab. */
  propertyImages?: string[];
}

export function ImageField({ clientId, label, value, onChange, propertyImages }: Props) {
  const [picker, setPicker] = useState(false);
  const [urlPaste, setUrlPaste] = useState(value.imageUrl ?? '');
  const handlePick = (items: MediaPickerSelection[]) => {
    const first = items[0];
    if (!first) return;
    onChange({ imageUrl: first.url, imageId: first.imageId ?? null });
    setUrlPaste(first.url);
  };

  return (
    <div className="space-y-2" data-testid="image-field">
      {label && (
        <label className="block text-xs font-medium text-white-50 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'shrink-0 w-20 h-20 rounded-lg overflow-hidden border bg-white-3',
            value.imageUrl ? 'border-white-10' : 'border-dashed border-white-15',
          )}
        >
          {value.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white-30">
              <ImageIcon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setPicker(true)}
              data-testid="image-field-choose"
              className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20 transition-colors"
            >
              {value.imageUrl ? 'Replace…' : 'Choose…'}
            </button>
            {value.imageUrl && (
              <button
                type="button"
                onClick={() => {
                  onChange({ imageUrl: null, imageId: null });
                  setUrlPaste('');
                }}
                data-testid="image-field-remove"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs text-white-40 hover:bg-white-10 hover:text-white-60 transition-colors"
              >
                <XIcon className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>
          <input
            type="text"
            value={urlPaste}
            onChange={(e) => setUrlPaste(e.target.value)}
            onBlur={() => {
              const trimmed = urlPaste.trim();
              if (trimmed === (value.imageUrl ?? '')) return;
              if (trimmed === '') {
                onChange({ imageUrl: null, imageId: null });
                return;
              }
              if (/^https?:\/\//i.test(trimmed)) {
                onChange({ imageUrl: trimmed, imageId: null });
              }
            }}
            placeholder="or paste image URL"
            className="w-full px-2 py-1.5 rounded-md bg-white-5 border border-white-10 text-white-100 text-xs font-mono focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
        </div>
      </div>

      {picker && (
        <MediaPickerModal
          clientId={clientId}
          mode="single"
          propertyImages={propertyImages}
          onClose={() => setPicker(false)}
          onSelect={handlePick}
        />
      )}
    </div>
  );
}
