'use client';

import { useMemo, useRef, useState } from 'react';
import {
  X,
  Image as ImageIcon,
  Home as HomeIcon,
  Upload,
  Link as LinkIcon,
  Loader2,
  Check,
} from 'lucide-react';
import { useAssets, useUploadAsset } from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';

// Sites-03 — shared media picker modal used by the Site page
// editor's image / hero / gallery / testimonial blocks. Tabs
// adapt to the surface:
//   - Library       — workspace MediaAssets (always)
//   - Property Photos — only when the picker is opened on a
//                       PROPERTY-linked SitePage
//   - Upload        — file picker → POST /assets/upload (Cloudinary)
//   - URL           — paste an external URL (fallback)
//
// `mode='multi'` enables multi-select (for gallery). `existingUrls`
// dims already-selected items so users can't double-add.
//
// Selection shape — backward compat first: imageUrl is always set.
// imageId is set when the user picks from the workspace library.

export interface MediaPickerSelection {
  url: string;
  imageId?: string;
  publicId?: string;
  alt?: string;
  source: 'media_library' | 'property_photo' | 'upload' | 'external_url';
}

interface Props {
  clientId: string;
  mode?: 'single' | 'multi';
  propertyImages?: string[];
  existingUrls?: string[];
  onClose: () => void;
  onSelect: (items: MediaPickerSelection[]) => void;
}

type Tab = 'library' | 'property' | 'upload' | 'url';

const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export function MediaPickerModal({
  clientId,
  mode = 'single',
  propertyImages,
  existingUrls = [],
  onClose,
  onSelect,
}: Props) {
  const hasPropertyTab = (propertyImages?.length ?? 0) > 0;
  const [tab, setTab] = useState<Tab>(hasPropertyTab ? 'property' : 'library');
  const [picked, setPicked] = useState<MediaPickerSelection[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(0);

  const uploadAsset = useUploadAsset(clientId);
  const { data: assets, isLoading: assetsLoading } = useAssets(clientId, {
    status: 'READY',
    assetType: 'image',
  });
  const imageAssets = useMemo(
    () => assets?.filter((a) => a.assetType === 'image' && a.url) ?? [],
    [assets],
  );

  const isPicked = (url: string) => picked.some((p) => p.url === url);
  const isExisting = (url: string) => existingUrls.includes(url);

  const togglePick = (sel: MediaPickerSelection) => {
    if (mode === 'single') {
      onSelect([sel]);
      onClose();
      return;
    }
    setPicked((prev) =>
      prev.some((p) => p.url === sel.url)
        ? prev.filter((p) => p.url !== sel.url)
        : [...prev, sel],
    );
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      setError('Image URL must start with http(s)://');
      return;
    }
    setError(null);
    const sel: MediaPickerSelection = { url: trimmed, source: 'external_url' };
    setUrlInput('');
    if (mode === 'single') {
      onSelect([sel]);
      onClose();
    } else {
      setPicked((prev) => (prev.some((p) => p.url === sel.url) ? prev : [...prev, sel]));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    for (const file of Array.from(files)) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError(`Skipped ${file.name}: JPG, PNG, or WebP only.`);
        continue;
      }
      try {
        setUploading((n) => n + 1);
        const formData = new FormData();
        formData.append('file', file);
        const asset = await uploadAsset.mutateAsync({ formData, assetType: 'image' });
        if (asset.url) {
          const sel: MediaPickerSelection = {
            url: asset.url,
            imageId: asset.id,
            publicId: asset.publicId ?? undefined,
            alt: asset.altText ?? undefined,
            source: 'upload',
          };
          if (mode === 'single') {
            onSelect([sel]);
            onClose();
            return;
          }
          setPicked((prev) => (prev.some((p) => p.url === sel.url) ? prev : [...prev, sel]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleConfirmMulti = () => {
    if (picked.length === 0) {
      onClose();
      return;
    }
    onSelect(picked);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-2xl bg-sp-card border border-white-10 shadow-2xl flex flex-col max-h-[85vh]">
        <header className="flex items-center justify-between p-4 border-b border-white-10">
          <h2 className="text-sm font-semibold text-white-100">
            {mode === 'multi' ? 'Choose images' : 'Choose an image'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-white-40 hover:text-white-100 hover:bg-white-10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex items-center gap-1 border-b border-white-10 px-4">
          {hasPropertyTab && (
            <TabButton
              active={tab === 'property'}
              onClick={() => setTab('property')}
              icon={HomeIcon}
              label="Property Photos"
              badge={propertyImages!.length}
            />
          )}
          <TabButton
            active={tab === 'library'}
            onClick={() => setTab('library')}
            icon={ImageIcon}
            label="Library"
          />
          <TabButton
            active={tab === 'upload'}
            onClick={() => setTab('upload')}
            icon={Upload}
            label="Upload"
          />
          <TabButton
            active={tab === 'url'}
            onClick={() => setTab('url')}
            icon={LinkIcon}
            label="URL"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4" data-testid="media-picker-body">
          {error && (
            <p className="mb-3 text-xs text-accent-red bg-accent-red/10 border border-accent-red/20 rounded-md px-2 py-1.5">
              {error}
            </p>
          )}

          {tab === 'property' && (
            <PropertyTab
              images={propertyImages ?? []}
              picked={picked}
              isExisting={isExisting}
              isPicked={isPicked}
              onToggle={togglePick}
              mode={mode}
            />
          )}

          {tab === 'library' && (
            <LibraryTab
              assets={imageAssets}
              loading={assetsLoading}
              picked={picked}
              isExisting={isExisting}
              isPicked={isPicked}
              onToggle={togglePick}
              mode={mode}
            />
          )}

          {tab === 'upload' && (
            <div className="text-center py-10 space-y-3">
              <Upload className="w-8 h-8 text-white-40 mx-auto" />
              <p className="text-sm text-white-70">Upload JPG, PNG, or WebP from your computer.</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_MIME.join(',')}
                multiple={mode === 'multi'}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading > 0}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
                  'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {uploading > 0 ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {uploading > 0 ? `Uploading ${uploading}…` : 'Choose file(s)'}
              </button>
            </div>
          )}

          {tab === 'url' && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-white-50 block mb-1">External image URL</span>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUrl();
                    }
                  }}
                  placeholder="https://…"
                  className="w-full px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
                />
              </label>
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={urlInput.trim().length === 0}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold',
                  'bg-accent-green-110/10 text-accent-green-110 hover:bg-accent-green-110/20',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
              >
                {mode === 'single' ? 'Use this URL' : 'Add'}
              </button>
            </div>
          )}
        </div>

        {mode === 'multi' && (
          <footer className="flex items-center justify-between gap-2 p-4 border-t border-white-10">
            <span className="text-xs text-white-50">
              {picked.length} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-sm text-white-60 hover:bg-white-10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmMulti}
                disabled={picked.length === 0}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold',
                  'bg-accent-green-110 text-black hover:bg-accent-green-110/90',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                Add {picked.length || ''} image{picked.length === 1 ? '' : 's'}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof ImageIcon;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors',
        active
          ? 'border-accent-green-110 text-accent-green-110'
          : 'border-transparent text-white-40 hover:text-white-100',
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
      {badge !== undefined && (
        <span className="px-1 py-0.5 rounded-full text-[9px] bg-white-10 text-white-50">
          {badge}
        </span>
      )}
    </button>
  );
}

function PropertyTab({
  images,
  picked,
  isExisting,
  isPicked,
  onToggle,
  mode,
}: {
  images: string[];
  picked: MediaPickerSelection[];
  isExisting: (url: string) => boolean;
  isPicked: (url: string) => boolean;
  onToggle: (sel: MediaPickerSelection) => void;
  mode: 'single' | 'multi';
}) {
  if (images.length === 0) {
    return (
      <p className="text-sm text-white-50 text-center py-10">
        No property photos yet. Add photos in the Data Library or use Media Library.
      </p>
    );
  }
  return (
    <ThumbGrid
      urls={images}
      onPick={(url) => onToggle({ url, source: 'property_photo' })}
      isPicked={isPicked}
      isExisting={isExisting}
      mode={mode}
    />
  );
}

function LibraryTab({
  assets,
  loading,
  picked,
  isExisting,
  isPicked,
  onToggle,
  mode,
}: {
  assets: Array<{ id: string; url: string | null; thumbnailUrl: string | null; publicId: string | null; altText: string | null }>;
  loading: boolean;
  picked: MediaPickerSelection[];
  isExisting: (url: string) => boolean;
  isPicked: (url: string) => boolean;
  onToggle: (sel: MediaPickerSelection) => void;
  mode: 'single' | 'multi';
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-5 h-5 text-white-30 animate-spin" />
      </div>
    );
  }
  if (assets.length === 0) {
    return (
      <p className="text-sm text-white-50 text-center py-10">
        No images in your library yet. Upload one from the Upload tab.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
      {assets.map((asset) => {
        if (!asset.url) return null;
        const url = asset.url;
        const sel: MediaPickerSelection = {
          url,
          imageId: asset.id,
          publicId: asset.publicId ?? undefined,
          alt: asset.altText ?? undefined,
          source: 'media_library',
        };
        const existing = isExisting(url);
        const selected = isPicked(url);
        return (
          <Thumb
            key={asset.id}
            src={asset.thumbnailUrl ?? url}
            alt={asset.altText ?? ''}
            disabled={existing}
            selected={selected}
            onClick={() => !existing && onToggle(sel)}
            mode={mode}
          />
        );
      })}
    </div>
  );
}

function ThumbGrid({
  urls,
  onPick,
  isPicked,
  isExisting,
  mode,
}: {
  urls: string[];
  onPick: (url: string) => void;
  isPicked: (url: string) => boolean;
  isExisting: (url: string) => boolean;
  mode: 'single' | 'multi';
}) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-5 gap-2">
      {urls.map((url) => (
        <Thumb
          key={url}
          src={url}
          disabled={isExisting(url)}
          selected={isPicked(url)}
          onClick={() => !isExisting(url) && onPick(url)}
          mode={mode}
        />
      ))}
    </div>
  );
}

function Thumb({
  src,
  alt = '',
  disabled,
  selected,
  onClick,
  mode,
}: {
  src: string;
  alt?: string;
  disabled?: boolean;
  selected?: boolean;
  onClick: () => void;
  mode: 'single' | 'multi';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid="media-picker-thumb"
      className={cn(
        'relative rounded-md overflow-hidden aspect-square border transition-colors',
        disabled
          ? 'border-white-10 opacity-30 cursor-not-allowed'
          : selected
            ? 'border-accent-green-110 ring-2 ring-accent-green-110/40'
            : 'border-white-10 hover:border-white-30',
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      {selected && mode === 'multi' && (
        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent-green-110 text-black flex items-center justify-center">
          <Check className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}
