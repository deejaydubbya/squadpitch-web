'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Search,
  Loader2,
  Film,
  Image as ImageIcon,
  LayoutGrid,
  Play,
  Check,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAssetsPaginated,
  useFolders,
  type MediaAsset,
  type MediaAssetType,
} from '@/hooks/useSquadpitch';

/** Minimal asset info needed for the selection strip thumbnails */
interface AssetSeed {
  id: string;
  url: string | null;
  thumbnailUrl: string | null;
  assetType: string;
}

interface Props {
  clientId: string;
  draftId: string;
  open: boolean;
  onClose: () => void;
  /** Called with selected asset IDs when user clicks Apply */
  onApply: (assetIds: string[]) => void;
  /** Pre-selected asset IDs (e.g. from existing draft media) */
  initialSelected?: string[];
  /** Full asset data for pre-selected items (so thumbnails render immediately) */
  initialAssets?: AssetSeed[];
  /** Show a pending state on the Apply button */
  applying?: boolean;
}

/**
 * Thin wrapper — only mounts the inner content when `open` is true.
 * This ensures hooks run fresh each time the modal opens (no stale cached data).
 */
export function MediaSwapModal({ open, ...rest }: Props) {
  if (!open) return null;
  return <MediaSwapModalContent {...rest} />;
}

// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 24;

function MediaSwapModalContent({
  clientId,
  onClose,
  onApply,
  initialSelected = [],
  initialAssets = [],
  applying = false,
}: Omit<Props, 'open'>) {
  // ── Search ──────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // ── Filters ─────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<MediaAssetType | 'all'>('all');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // ── Multi-select ────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const removeSelected = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ── Folders ─────────────────────────────────────────────────────
  const { data: folders } = useFolders(clientId);

  // ── Pagination ──────────────────────────────────────────────────
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulatedAssets, setAccumulatedAssets] = useState<MediaAsset[]>([]);

  const baseFilters = useMemo(() => {
    const f: Record<string, string> = { status: 'READY', limit: String(PAGE_SIZE) };
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    if (typeFilter !== 'all') f.assetType = typeFilter;
    if (activeFolderId === 'unfiled') f.folderId = 'UNFILED';
    else if (activeFolderId) f.folderId = activeFolderId;
    return f;
  }, [debouncedSearch, typeFilter, activeFolderId]);

  // Reset pagination when filters change
  useEffect(() => {
    setCursor(undefined);
    setAccumulatedAssets([]);
  }, [baseFilters]);

  const filters = useMemo(() => {
    if (cursor) return { ...baseFilters, cursor };
    return baseFilters;
  }, [baseFilters, cursor]);

  const { data: page, isLoading, isFetching } = useAssetsPaginated(clientId, filters);

  // Accumulate pages
  useEffect(() => {
    if (page?.assets) {
      setAccumulatedAssets((prev) => {
        if (!cursor) return page.assets;
        const existingIds = new Set(prev.map((a) => a.id));
        const newAssets = page.assets.filter((a) => !existingIds.has(a.id));
        return [...prev, ...newAssets];
      });
    }
  }, [page, cursor]);

  const assets = accumulatedAssets;
  // Keep hasMore true while fetching the next page (page is undefined during fetch)
  const hasMore = page ? page.hasMore : (isFetching && !!cursor);

  const handleLoadMore = () => {
    if (page?.nextCursor) {
      setCursor(page.nextCursor);
    }
  };

  // ── Seen-asset map (persists across filter/folder changes) ─────
  // Seeded with initialAssets so selection strip thumbnails render immediately,
  // then updated whenever new pages are loaded.
  const [seenAssets, setSeenAssets] = useState<Map<string, AssetSeed>>(() => {
    const map = new Map<string, AssetSeed>();
    initialAssets.forEach((a) => map.set(a.id, a));
    return map;
  });

  useEffect(() => {
    if (page?.assets) {
      setSeenAssets((prev) => {
        const next = new Map(prev);
        page.assets.forEach((a) => next.set(a.id, a));
        return next;
      });
    }
  }, [page]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] rounded-xl bg-sp-surface border border-white-10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white-10">
          <h3 className="text-sm font-semibold text-white-80">Choose Media</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white-10 text-white-40 hover:text-white-80 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selection strip */}
        {selected.size > 0 && (
          <div className="px-4 py-2 border-b border-white-10 space-y-1">
            <p className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
              {selected.size} selected
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {Array.from(selected).map((id) => {
                const asset = seenAssets.get(id);
                const isVideo = asset?.assetType === 'video';
                const thumb = asset
                  ? (isVideo ? (asset.thumbnailUrl || asset.url) : (asset.url || asset.thumbnailUrl))
                  : null;
                return (
                  <div
                    key={id}
                    className="relative flex-shrink-0 w-10 h-10 rounded-md border border-accent-green-110/40 overflow-hidden group"
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white-5 flex items-center justify-center">
                        {isVideo ? (
                          <Film className="w-3 h-3 text-white-20" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-white-20" />
                        )}
                      </div>
                    )}
                    {isVideo && (
                      <div className="absolute top-0 left-0 p-0.5 bg-black/70 rounded-br">
                        <Film className="w-2 h-2 text-white/70" />
                      </div>
                    )}
                    <button
                      onClick={() => removeSelected(id)}
                      className="absolute top-0 right-0 p-0.5 bg-black/70 rounded-bl text-white/60 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search + type filter */}
        <div className="px-4 py-2 space-y-2 border-b border-white-10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white-30" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
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

        {/* Folder pills */}
        <div className="px-4 py-2 border-b border-white-10">
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
            <button
              onClick={() => setActiveFolderId(null)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors',
                activeFolderId === null
                  ? 'bg-accent-green-110 text-sp-bg'
                  : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60'
              )}
            >
              All
            </button>
            <button
              onClick={() => setActiveFolderId('unfiled')}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors',
                activeFolderId === 'unfiled'
                  ? 'bg-accent-green-110 text-sp-bg'
                  : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60'
              )}
            >
              Unfiled
            </button>
            {folders?.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolderId(folder.id)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1',
                  activeFolderId === folder.id
                    ? 'bg-accent-green-110 text-sp-bg'
                    : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60'
                )}
              >
                <FolderOpen className="w-2.5 h-2.5" />
                {folder.name}
                <span className="opacity-60">({folder.assetCount})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Asset grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && assets.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-white-40" />
            </div>
          ) : !assets.length ? (
            <div className="flex flex-col items-center py-8">
              <ImageIcon className="w-5 h-5 text-white-30 mb-2" />
              <p className="text-xs text-white-40">
                {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No assets found'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-2">
                {assets.map((asset) => {
                  const isSelected = selected.has(asset.id);
                  const thumb = asset.assetType === 'video'
                    ? (asset.thumbnailUrl || asset.url)
                    : (asset.url || asset.thumbnailUrl);
                  return (
                    <button
                      key={asset.id}
                      onClick={() => toggle(asset.id)}
                      className={cn(
                        'relative aspect-square rounded-lg border overflow-hidden transition-all group',
                        isSelected
                          ? 'border-accent-green-110 ring-1 ring-accent-green-110/40'
                          : 'border-white-10 hover:border-white-20'
                      )}
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
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
                      {/* Selection check */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-accent-green-110 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-sp-surface" />
                        </div>
                      )}
                      <div className={cn(
                        'absolute inset-0 transition-colors pointer-events-none',
                        isSelected ? 'bg-accent-green-110/10' : 'bg-transparent group-hover:bg-white/5'
                      )} />
                    </button>
                  );
                })}
              </div>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-60 hover:bg-white-20 hover:text-white-80 transition-colors disabled:opacity-50"
                  >
                    {isFetching ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer — Apply / Cancel */}
        <div className="px-4 py-3 border-t border-white-10 flex items-center justify-between">
          <p className="text-xs text-white-40">
            {selected.size === 0
              ? 'Select one or more assets'
              : `${selected.size} asset${selected.size > 1 ? 's' : ''} selected`}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-40 hover:text-white-60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onApply(Array.from(selected))}
              disabled={selected.size === 0 || applying}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-surface hover:bg-accent-green-110/90 transition-colors disabled:opacity-50"
            >
              {applying && <Loader2 className="w-3 h-3 animate-spin" />}
              Apply ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
