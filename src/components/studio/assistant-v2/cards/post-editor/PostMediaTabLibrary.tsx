import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, FolderOpen, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssetsPaginated, useFolders, type MediaAsset } from '@/hooks/useSquadpitch';
import { PostMediaTile } from './PostMediaTile';

type PropertyImageEntry = string | { url?: string; src?: string; imageUrl?: string; label?: string };

interface PostMediaTabLibraryProps {
  clientId: string;
  assetMap: Map<string, MediaAsset>;
  propertyImages: PropertyImageEntry[];
  itemImages?: Array<string | { url?: string; label?: string }>;
  suggestedIds: Set<string>;
  picked: Set<string>;
  onToggle: (id: string) => void;
}

const PAGE_SIZE = 24;

export function PostMediaTabLibrary({
  clientId,
  assetMap,
  propertyImages,
  itemImages,
  suggestedIds,
  picked,
  onToggle,
}: PostMediaTabLibraryProps) {
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');

  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Folders
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const { data: folders } = useFolders(clientId);

  // Pagination
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [accumulatedAssets, setAccumulatedAssets] = useState<MediaAsset[]>([]);

  const baseFilters = useMemo(() => {
    const f: Record<string, string> = { status: 'READY', limit: String(PAGE_SIZE) };
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    if (filter !== 'all') f.assetType = filter;
    if (activeFolderId === 'unfiled') f.folderId = 'UNFILED';
    else if (activeFolderId) f.folderId = activeFolderId;
    return f;
  }, [debouncedSearch, filter, activeFolderId]);

  // Reset pagination on filter change
  useEffect(() => {
    setCursor(undefined);
    setAccumulatedAssets([]);
  }, [baseFilters]);

  const paginatedFilters = useMemo(() => {
    if (cursor) return { ...baseFilters, cursor };
    return baseFilters;
  }, [baseFilters, cursor]);

  const { data: page, isLoading, isFetching } = useAssetsPaginated(clientId, paginatedFilters);

  // Accumulate assets across pages
  useEffect(() => {
    if (page?.assets) {
      setAccumulatedAssets((prev) => {
        if (!cursor) return page.assets;
        const existingIds = new Set(prev.map((a) => a.id));
        const newAssets = page.assets.filter((a: MediaAsset) => !existingIds.has(a.id));
        return [...prev, ...newAssets];
      });
    }
  }, [page, cursor]);

  const assets = accumulatedAssets;
  const hasMore = page?.hasMore ?? false;

  return (
    <div className="space-y-2">
      {/* Header + type filter */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-white-40 uppercase tracking-wider">Media Library</p>
        <div className="flex gap-1">
          {(['all', 'image', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors',
                filter === f
                  ? 'bg-accent-green-110/20 text-accent-green-110'
                  : 'text-white-30 hover:text-white-60',
              )}
            >
              {f === 'all' ? 'All' : f === 'image' ? 'Images' : 'Videos'}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white-40" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search media..."
          className="w-full pl-7 pr-2 py-1 rounded-lg bg-white-5 border border-white-10 text-[11px] text-white-100 placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50"
        />
      </div>

      {/* Folder pills */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
        <button
          onClick={() => setActiveFolderId(null)}
          className={cn(
            'px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap transition-colors',
            activeFolderId === null
              ? 'bg-accent-green-110 text-sp-bg'
              : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60',
          )}
        >
          All
        </button>
        <button
          onClick={() => setActiveFolderId('unfiled')}
          className={cn(
            'px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap transition-colors',
            activeFolderId === 'unfiled'
              ? 'bg-accent-green-110 text-sp-bg'
              : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60',
          )}
        >
          Unfiled
        </button>
        {folders?.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFolderId(folder.id)}
            className={cn(
              'px-1.5 py-0.5 rounded-full text-[9px] font-medium whitespace-nowrap transition-colors flex items-center gap-0.5',
              activeFolderId === folder.id
                ? 'bg-accent-green-110 text-sp-bg'
                : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60',
            )}
          >
            <FolderOpen className="w-2.5 h-2.5" />
            {folder.name}
            <span className="opacity-60">({folder.assetCount})</span>
          </button>
        ))}
      </div>

      {/* Asset grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-white-40" />
        </div>
      ) : assets.length === 0 ? (
        <p className="text-[10px] text-white-30 text-center py-3">
          {debouncedSearch
            ? `No results for "${debouncedSearch}"`
            : filter === 'all'
              ? 'No media in library'
              : `No ${filter}s in library`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1 max-h-[180px] overflow-y-auto">
            {assets.map((asset) => (
              <PostMediaTile
                key={asset.id}
                id={asset.id}
                assetMap={assetMap}
                propertyImages={propertyImages}
                itemImages={itemImages}
                suggestedIds={suggestedIds}
                selected={picked.has(asset.id)}
                onClick={() => onToggle(asset.id)}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={() => page?.nextCursor && setCursor(page.nextCursor)}
                disabled={isFetching}
                className="flex items-center gap-1 text-[10px] text-white-40 hover:text-white-60 disabled:opacity-50"
              >
                {isFetching ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                ) : (
                  <ChevronDown className="w-2.5 h-2.5" />
                )}
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
