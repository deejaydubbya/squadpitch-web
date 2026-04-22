'use client';

import { useMemo, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { useAssets } from '@/hooks/useSquadpitch';
import type { SelectableImage, MediaTabProps } from './types';
import { MediaTile } from './MediaTile';

interface MediaTabRecentProps extends MediaTabProps {
  onImagesAvailable: (images: SelectableImage[]) => void;
}

export function MediaTabRecent({
  clientId,
  selected,
  heroId,
  onToggle,
  onToggleHero,
  onPreview,
  priorityScoreMap,
  mediaTypeFilter,
  onImagesAvailable,
}: MediaTabRecentProps) {
  const { data: assets, isLoading } = useAssets(clientId, {
    status: 'READY',
    ...(mediaTypeFilter && mediaTypeFilter !== 'all' ? { assetType: mediaTypeFilter } : {}),
    limit: 20,
  });

  const images: SelectableImage[] = useMemo(() => {
    if (!assets) return [];
    return assets.map((asset) => ({
      id: asset.id,
      url: asset.url || '',
      thumbnailUrl: asset.thumbnailUrl || asset.url,
      source: 'recent' as const,
      tags: asset.tags,
      qualityScore: priorityScoreMap.get(asset.id) ?? null,
      assetType: asset.assetType,
      videoDurationSec: asset.videoDurationSec,
      asset,
    }));
  }, [assets, priorityScoreMap]);

  useEffect(() => {
    if (images.length > 0) {
      onImagesAvailable(images);
    }
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <ImageIcon className="w-5 h-5 text-white-30 mb-2" />
        <p className="text-xs text-white-40">No recent media</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
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
  );
}
