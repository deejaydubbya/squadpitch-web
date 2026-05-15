'use client';

import { useMemo, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { useDataItem } from '@/hooks/useSquadpitch';
import type { AssistantSessionState } from '@/lib/assistant/types';
import type { SelectableImage, MediaTabProps } from './types';
import { MediaTile } from './MediaTile';
import { FindListingPhotos } from './FindListingPhotos';

interface MediaTabContextProps extends MediaTabProps {
  session: AssistantSessionState;
  onSelectAll: (ids: string[]) => void;
  onClearIds: (ids: string[]) => void;
  onImagesAvailable: (images: SelectableImage[]) => void;
}

export function MediaTabContext({
  session,
  clientId,
  selected,
  heroId,
  onToggle,
  onToggleHero,
  onPreview,
  priorityScoreMap,
  onSelectAll,
  onClearIds,
  onImagesAvailable,
}: MediaTabContextProps) {
  const isDataItemMode = session.quickPostSource === 'data' && !!session.quickPostDataItemId;
  const { data: dataItem } = useDataItem(
    clientId,
    isDataItemMode ? session.quickPostDataItemId! : undefined,
  );

  // Build images from property data (campaign mode)
  const propertyImages: SelectableImage[] = useMemo(() => {
    if (isDataItemMode) return [];
    if (!session.propertyData) return [];
    const data = session.propertyData;
    // data.images can be string[] or {url, label}[] — normalize both formats
    const rawImages: Array<string | { url?: string; label?: string }> = Array.isArray(data.images)
      ? (data.images as Array<string | { url?: string; label?: string }>)
      : typeof data.imageUrl === 'string'
        ? [data.imageUrl]
        : [];
    const result: SelectableImage[] = [];
    for (let i = 0; i < rawImages.length; i++) {
      const entry = rawImages[i];
      const url = typeof entry === 'string' ? entry : entry?.url;
      const label = typeof entry === 'object' ? entry?.label : undefined;
      if (!url) continue;
      result.push({
        id: `property_img_${i}`,
        url,
        thumbnailUrl: url,
        source: 'property' as const,
        label: label || (i === 0 ? 'Primary' : undefined),
      });
    }
    return result;
  }, [session.propertyData, isDataItemMode]);

  // Build images from data item (quick post data mode)
  const itemImages: SelectableImage[] = useMemo(() => {
    if (!isDataItemMode || !dataItem) return [];
    const dataJson = dataItem.dataJson as Record<string, unknown>;
    const imgs = Array.isArray(dataJson?.images) ? (dataJson.images as string[]) : [];
    return imgs.map((url, i) => ({
      id: `item_img_${i}`,
      url,
      thumbnailUrl: url,
      source: 'item' as const,
      label: i === 0 ? 'Primary' : undefined,
    }));
  }, [isDataItemMode, dataItem]);

  const images = isDataItemMode ? itemImages : propertyImages;
  const imageIds = useMemo(() => images.map((img) => img.id), [images]);

  // Register images with orchestrator
  useEffect(() => {
    if (images.length > 0) {
      onImagesAvailable(images);
    }
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasPropertyAddress = !isDataItemMode && !!(session.propertyData &&
    (session.propertyData.street || session.propertyData.city));

  if (images.length === 0 && !hasPropertyAddress) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <Building2 className="w-5 h-5 text-white-30 mb-2" />
        <p className="text-xs text-white-40">
          {isDataItemMode ? 'No images found in this data item.' : 'No property photos available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasPropertyAddress && (
        <FindListingPhotos propertyData={session.propertyData!} />
      )}

      {images.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Building2 className="w-3 h-3 text-accent-green-110" />
            <span className="text-[10px] font-medium text-white-60 uppercase tracking-wider">
              {isDataItemMode ? 'Item Media' : 'Property Photos'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => onSelectAll(imageIds)}
                className="text-[10px] text-accent-green-110 hover:underline"
              >
                Select all
              </button>
              <button
                onClick={() => onClearIds(imageIds)}
                className="text-[10px] text-white-40 hover:text-white-60 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>
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
                priorityScore={null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
