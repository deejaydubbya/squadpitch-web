'use client';

import { useRef, useState } from 'react';
import { Upload, Link as LinkIcon, X, Star, StarOff, Loader2 } from 'lucide-react';
import { useUploadAsset } from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';
import {
  type PropertyPhoto,
  addPhoto,
  removePhoto,
  setPrimaryPhoto,
} from './propertyPhotos.helpers';

interface Props {
  clientId: string;
  photos: PropertyPhoto[];
  onChange: (next: PropertyPhoto[]) => void;
}

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPT_ATTR = ACCEPTED_MIME.join(',');

export function PropertyPhotosField({ clientId, photos, onChange }: Props) {
  const upload = useUploadAsset(clientId);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [pasteUrl, setPasteUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const list = Array.from(files);
    for (const file of list) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError(`Skipped ${file.name}: only JPG, PNG, or WebP photos are accepted.`);
        continue;
      }
      try {
        setUploading((n) => n + 1);
        const formData = new FormData();
        formData.append('file', file);
        const asset = await upload.mutateAsync({ formData, assetType: 'image' });
        if (asset.url) {
          onChange(
            addPhoto(photos, {
              url: asset.url,
              source: 'upload',
              publicId: asset.publicId ?? undefined,
              alt: asset.altText ?? undefined,
            }),
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handlePasteUrl = () => {
    const trimmed = pasteUrl.trim();
    if (!trimmed) return;
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('Image URL must start with http(s)://');
      return;
    }
    onChange(addPhoto(photos, { url: trimmed, source: 'external_url' }));
    setPasteUrl('');
    setError(null);
  };

  return (
    <div className="space-y-3" data-testid="property-photos-field">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading > 0}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            'bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {uploading > 0 ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading > 0 ? `Uploading ${uploading}…` : 'Upload photos'}
        </button>

        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <LinkIcon className="w-3.5 h-3.5 text-white-40" />
          <input
            type="text"
            value={pasteUrl}
            onChange={(e) => setPasteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePasteUrl();
              }
            }}
            placeholder="Paste image URL…"
            className="flex-1 px-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
          />
          <button
            type="button"
            onClick={handlePasteUrl}
            disabled={pasteUrl.trim().length === 0}
            className="px-2 py-1.5 rounded-lg text-xs text-white-60 hover:bg-white-10 transition-colors disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-md px-2 py-1.5">
          {error}
        </p>
      )}

      {photos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white-15 bg-white-3 p-4 text-center text-xs text-white-40">
          No photos yet. Upload from your computer or paste an image URL.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => {
            const isPrimary = p.isPrimary === true;
            return (
              <div
                key={p.url}
                className={cn(
                  'relative rounded-lg overflow-hidden border group',
                  isPrimary ? 'border-accent-green-110' : 'border-white-10',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.alt ?? ''} className="w-full h-24 object-cover" />
                {isPrimary && (
                  <span className="absolute top-1 left-1 text-[9px] font-semibold uppercase tracking-wider bg-accent-green-110 text-black rounded px-1.5 py-0.5">
                    Primary
                  </span>
                )}
                <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isPrimary && (
                    <button
                      type="button"
                      onClick={() => onChange(setPrimaryPhoto(photos, p.url))}
                      className="p-1 rounded bg-black/60 text-white-100 hover:bg-black/80"
                      title="Set as primary"
                      data-testid="photo-set-primary"
                    >
                      <Star className="w-3 h-3" />
                    </button>
                  )}
                  {isPrimary && (
                    <span className="p-1 rounded bg-black/60 text-white-40">
                      <StarOff className="w-3 h-3" />
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(removePhoto(photos, p.url))}
                    className="p-1 rounded bg-black/60 text-red-300 hover:bg-black/80"
                    title="Remove"
                    data-testid="photo-remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
