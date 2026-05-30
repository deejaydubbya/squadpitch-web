'use client';

// Ads-10 — SquadAds creative asset picker.
//
// Modal grid of the workspace's media library. Tenant-scoped on the
// server (useAssets pulls /workspaces/:id/assets) so cross-workspace
// assets never appear here in the first place; backend re-validates
// at upsertCreative time as defense in depth.
//
// Two modes:
//   - mode: 'primary' — single-select, replaces the current primary.
//   - mode: 'additional' — multi-select, appended to the current
//     additional[] list (caller manages the list).

import { useMemo, useState } from 'react';
import { Check, ImageIcon, Loader2, Search, Video, X } from 'lucide-react';
import { useAssets, type MediaAsset } from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';

interface AssetPickerProps {
  clientId: string;
  mode: 'primary' | 'additional';
  // Already-attached ids — visually marked so the user can't double-pick.
  excludeIds?: string[];
  onClose: () => void;
  onSelect: (asset: MediaAsset) => void;
}

export function AssetPicker({
  clientId,
  mode,
  excludeIds = [],
  onClose,
  onSelect,
}: AssetPickerProps) {
  const [filter, setFilter] = useState('');
  const { data: assets, isLoading } = useAssets(clientId, {
    status: 'READY',
    limit: 200,
  });

  const visible = useMemo(() => {
    const all = assets ?? [];
    const q = filter.trim().toLowerCase();
    return all.filter((a) => {
      if (!q) return true;
      const haystack = `${a.filename ?? ''} ${a.altText ?? ''} ${(a.tags ?? []).join(' ')}`;
      return haystack.toLowerCase().includes(q);
    });
  }, [assets, filter]);
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-sp-bg border border-white-15 rounded-2xl w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white-10">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white-100">
              {mode === 'primary' ? 'Pick a primary asset' : 'Add an additional asset'}
            </h2>
            <p className="text-[11px] text-white-50 mt-0.5">
              Only assets in this workspace are shown.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-white-40 pointer-events-none" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search by filename, alt text, tag…"
                className="bg-white-5 border border-white-10 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30 w-64"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10"
              aria-label="Close picker"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-sm text-white-50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading assets…
            </div>
          ) : visible.length === 0 ? (
            <div className="text-sm text-white-50">
              {filter ? `No assets match “${filter}”.` : 'No assets in this workspace yet.'}
            </div>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {visible.map((a) => (
                <AssetTile
                  key={a.id}
                  asset={a}
                  selected={excludeSet.has(a.id)}
                  onPick={() => {
                    onSelect(a);
                    onClose();
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetTile({
  asset,
  selected,
  onPick,
}: {
  asset: MediaAsset;
  selected: boolean;
  onPick: () => void;
}) {
  const previewUrl = asset.thumbnailUrl || asset.url;
  const isVideo = asset.assetType === 'video';
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={selected}
        className={cn(
          'w-full text-left rounded-lg border overflow-hidden transition-colors',
          selected
            ? 'border-accent-green-110/40 bg-accent-green-110/5 cursor-default'
            : 'border-white-10 hover:border-white-30 bg-white-5',
        )}
        title={asset.filename ?? asset.id}
      >
        <div className="relative aspect-square bg-white-5 flex items-center justify-center">
          {previewUrl ? (
            // Next/Image needs a known host configured. Use a plain
            // img tag so any uploaded asset URL renders without
            // remote-image whitelisting friction.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={asset.altText ?? asset.filename ?? ''}
              className="w-full h-full object-cover"
            />
          ) : isVideo ? (
            <Video className="w-6 h-6 text-white-40" />
          ) : (
            <ImageIcon className="w-6 h-6 text-white-40" />
          )}
          {selected && (
            <span className="absolute top-1 right-1 bg-accent-green-110 text-sp-bg rounded-full p-1">
              <Check className="w-3 h-3" />
            </span>
          )}
          {isVideo && (
            <span className="absolute bottom-1 left-1 bg-black/60 text-white-100 text-[10px] px-1.5 py-0.5 rounded">
              VIDEO
            </span>
          )}
        </div>
        <div className="p-1.5 text-[10px] text-white-60 truncate">
          {asset.filename ?? asset.id}
        </div>
      </button>
    </li>
  );
}

