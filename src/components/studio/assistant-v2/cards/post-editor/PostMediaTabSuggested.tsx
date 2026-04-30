import { useMemo } from 'react';
import { ImageIcon } from 'lucide-react';
import type { MediaAsset } from '@/hooks/useSquadpitch';
import type { PostMediaSuggestion } from './PostMediaSelector.types';
import { PostMediaTile } from './PostMediaTile';

type PropertyImageEntry = string | { url?: string; src?: string; imageUrl?: string; label?: string };

interface PostMediaTabSuggestedProps {
  propertyImages: PropertyImageEntry[];
  itemImages?: Array<string | { url?: string; label?: string }>;
  sessionSelectedMediaIds?: string[];
  suggestedIds?: PostMediaSuggestion[];
  assetMap: Map<string, MediaAsset>;
  picked: Set<string>;
  onToggle: (id: string) => void;
}

export function PostMediaTabSuggested({
  propertyImages,
  itemImages,
  sessionSelectedMediaIds,
  suggestedIds,
  assetMap,
  picked,
  onToggle,
}: PostMediaTabSuggestedProps) {
  // Build a unified list of suggested media IDs
  const allIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();

    // Explicit suggestions first
    if (suggestedIds) {
      for (const s of suggestedIds) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          ids.push(s.id);
        }
      }
    }

    // Synthetic property images
    if (propertyImages.length > 0) {
      for (let i = 0; i < propertyImages.length; i++) {
        const id = `property_img_${i}`;
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }

    // Synthetic item images
    if (itemImages && itemImages.length > 0) {
      for (let i = 0; i < itemImages.length; i++) {
        const id = `item_img_${i}`;
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }

    // Session pool media
    if (sessionSelectedMediaIds) {
      for (const id of sessionSelectedMediaIds) {
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }

    return ids;
  }, [propertyImages, itemImages, sessionSelectedMediaIds, suggestedIds]);

  const suggestedSet = useMemo(() => new Set(allIds), [allIds]);

  // Reason tooltips map
  const reasonMap = useMemo(() => {
    const map = new Map<string, string>();
    if (suggestedIds) {
      for (const s of suggestedIds) {
        if (s.reason) map.set(s.id, s.reason);
      }
    }
    return map;
  }, [suggestedIds]);

  if (allIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-1.5">
        <ImageIcon className="w-5 h-5 text-white-20" />
        <p className="text-xs text-white-40">No suggested media yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5 max-h-[200px] overflow-y-auto">
      {allIds.map((id) => {
        const reason = reasonMap.get(id);
        return (
          <div key={id} className="flex flex-col gap-0.5">
            <PostMediaTile
              id={id}
              assetMap={assetMap}
              propertyImages={propertyImages}
              itemImages={itemImages}
              suggestedIds={suggestedSet}
              selected={picked.has(id)}
              onClick={() => onToggle(id)}
            />
            {reason && (
              <span className="text-[8px] text-white-40 leading-tight truncate px-0.5" title={reason}>
                {reason}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
