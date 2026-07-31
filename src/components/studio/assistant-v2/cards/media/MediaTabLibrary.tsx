'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Search, FolderOpen, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAssets, useFolders } from '@/hooks/useSquadpitch';
import type { MediaPrioritization } from '@/lib/assistant/campaignIntelligence.types';
import type { SelectableImage, MediaTabProps } from './types';
import { MediaTile } from './MediaTile';

interface MediaTabLibraryProps extends MediaTabProps {
  mediaRec: MediaPrioritization | null;
  onImagesAvailable: (images: SelectableImage[]) => void;
}

export function MediaTabLibrary({
  clientId,
  selected,
  heroId,
  onToggle,
  onToggleHero,
  onPreview,
  priorityScoreMap,
  mediaRec,
  mediaTypeFilter,
  onImagesAvailable,
}: MediaTabLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce search input
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const { data: folders } = useFolders(clientId);
  const { data: assets, isLoading } = useAssets(clientId, {
    status: 'READY',
    ...(mediaTypeFilter && mediaTypeFilter !== 'all' ? { assetType: mediaTypeFilter } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(activeFolderId === 'unfiled' ? { folderId: 'null' } : activeFolderId ? { folderId: activeFolderId } : {}),
  });

  const images: SelectableImage[] = useMemo(() => {
    if (!assets) return [];
    const sorted = mediaRec
      ? [...assets].sort((a, b) => {
          const priorityMap = new Map(mediaRec.prioritized.map((p, i) => [p.id, i]));
          return (priorityMap.get(a.id) ?? Infinity) - (priorityMap.get(b.id) ?? Infinity);
        })
      : assets;
    return sorted.map((asset) => ({
      id: asset.id,
      url: asset.url || '',
      thumbnailUrl: asset.thumbnailUrl || asset.url,
      source: 'library' as const,
      label: mediaRec?.heroImageId === asset.id ? 'Recommended' : undefined,
      tags: asset.tags,
      qualityScore: priorityScoreMap.get(asset.id) ?? null,
      assetType: asset.assetType,
      videoDurationSec: asset.videoDurationSec,
      asset,
    }));
  }, [assets, mediaRec, priorityScoreMap]);

  useEffect(() => {
    if (images.length > 0) {
      onImagesAvailable(images);
    }
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white-40" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search media..."
          className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-xs text-white-100 placeholder:text-white-30 focus:outline-none focus:border-accent-green-110/50"
        />
      </div>

      {/* Folder pills */}
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

      {/* Image grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center py-4 text-center">
          <ImageIcon className="w-5 h-5 text-white-30 mb-2" />
          <p className="text-xs text-white-40">
            {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No media in library'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5 max-h-[280px] overflow-y-auto">
          {images.map((img) => (
            <MediaTile
              key={img.id}
              image={img}
              isSelected={selected.has(img.id)}
              isHero={heroId === img.id}
              onToggle={onToggle}
              onHeroToggle={onToggleHero}
              onPreview={onPreview}
              priorityScore={priorityScoreMap.get(img.id) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
