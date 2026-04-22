'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Loader2, Film, Image as ImageIcon, LayoutGrid, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAssets,
  useAttachAsset,
  type MediaAsset,
  type MediaAssetType,
} from '@/hooks/useSquadpitch';

interface Props {
  clientId: string;
  draftId: string;
  open: boolean;
  onClose: () => void;
}

export function MediaSwapModal({ clientId, draftId, open, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaAssetType | 'all'>('all');

  const attachAsset = useAttachAsset(clientId);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(() => {
    const f: Record<string, string> = { status: 'READY', limit: '30' };
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    if (typeFilter !== 'all') f.assetType = typeFilter;
    return f;
  }, [debouncedSearch, typeFilter]);

  const { data: assets, isLoading } = useAssets(clientId, filters);

  const handleSelect = (asset: MediaAsset) => {
    attachAsset.mutate(
      { assetId: asset.id, draftId },
      { onSuccess: () => onClose() }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-xl bg-sp-surface border border-white-10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white-10">
          <h3 className="text-sm font-semibold text-white-80">Choose Media</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white-10 text-white-40 hover:text-white-80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-4 py-2 space-y-2 border-b border-white-10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white-30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-80 placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'image', 'video'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1 transition-colors',
                  typeFilter === f ? 'bg-white-10 text-white-80' : 'text-white-30 hover:text-white-50'
                )}
              >
                {f === 'all' && <LayoutGrid className="w-2.5 h-2.5" />}
                {f === 'image' && <ImageIcon className="w-2.5 h-2.5" />}
                {f === 'video' && <Film className="w-2.5 h-2.5" />}
                {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Videos'}
              </button>
            ))}
          </div>
        </div>

        {/* Asset grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-white-40" />
            </div>
          ) : !assets?.length ? (
            <p className="text-center text-xs text-white-30 py-8">No assets found</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => handleSelect(asset)}
                  disabled={attachAsset.isPending}
                  className="relative aspect-square rounded-lg border border-white-10 overflow-hidden hover:border-accent-green-110 hover:ring-1 hover:ring-accent-green-110/40 transition-all group disabled:opacity-50"
                >
                  {asset.thumbnailUrl || asset.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnailUrl || asset.url || ''}
                      alt={asset.altText || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white-5 flex items-center justify-center">
                      {asset.assetType === 'video' ? (
                        <Film className="w-4 h-4 text-white-20" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-white-20" />
                      )}
                    </div>
                  )}
                  {asset.assetType === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                        <Play className="w-3 h-3 text-white fill-white" />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-accent-green-110/0 group-hover:bg-accent-green-110/10 transition-colors pointer-events-none" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Attaching indicator */}
        {attachAsset.isPending && (
          <div className="px-4 py-2 border-t border-white-10 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent-green-110" />
            <span className="text-xs text-white-40">Attaching...</span>
          </div>
        )}

        {attachAsset.isError && (
          <div className="px-4 py-2 border-t border-white-10">
            <p className="text-xs text-accent-red">
              {(attachAsset.error as Error)?.message || 'Failed to attach asset'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
