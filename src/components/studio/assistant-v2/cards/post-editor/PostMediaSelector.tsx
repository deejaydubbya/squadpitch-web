import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { MediaAsset } from '@/hooks/useSquadpitch';
import { AssetPreviewModal } from '../AssetPreviewModal';
import type { PostMediaSelectorProps, PostMediaTab } from './PostMediaSelector.types';
import { PostMediaTabSuggested } from './PostMediaTabSuggested';
import { PostMediaTabLibrary } from './PostMediaTabLibrary';
import { PostMediaTabGenerate } from './PostMediaTabGenerate';

export function PostMediaSelector({
  clientId,
  mediaIds,
  onMediaChange,
  assetMap,
  propertyImages,
  itemImages,
  suggestedIds,
  sessionSelectedMediaIds,
  aiAvailable,
  defaultGuidance,
  mediaPlan,
  onLocalAssetAdded,
  onClose,
}: PostMediaSelectorProps) {
  // Determine if we have suggested content
  const hasSuggestions =
    (suggestedIds && suggestedIds.length > 0) ||
    propertyImages.length > 0 ||
    (itemImages && itemImages.length > 0) ||
    (sessionSelectedMediaIds && sessionSelectedMediaIds.length > 0);

  const initialTab: PostMediaTab = (() => {
    if (mediaPlan?.preferredSources?.[0] === 'ai_generated' && aiAvailable) return 'generate';
    if (hasSuggestions) return 'suggested';
    return 'library';
  })();

  const [activeTab, setActiveTab] = useState<PostMediaTab>(initialTab);
  const [picked, setPicked] = useState<Set<string>>(new Set(mediaIds));
  const [previewAsset, setPreviewAsset] = useState<MediaAsset | null>(null);

  // Merged asset map that includes locally-generated assets
  const [localGeneratedAssets, setLocalGeneratedAssets] = useState<Map<string, MediaAsset>>(
    new Map(),
  );

  const mergedAssetMap = useMemo(() => {
    const map = new Map(assetMap);
    localGeneratedAssets.forEach((a, id) => map.set(id, a));
    return map;
  }, [assetMap, localGeneratedAssets]);

  // Build suggested set for badge classification
  const suggestedSet = useMemo(() => {
    const set = new Set<string>();
    if (suggestedIds) {
      for (const s of suggestedIds) set.add(s.id);
    }
    if (sessionSelectedMediaIds) {
      for (const id of sessionSelectedMediaIds) set.add(id);
    }
    // Synthetic property images
    for (let i = 0; i < propertyImages.length; i++) set.add(`property_img_${i}`);
    if (itemImages) {
      for (let i = 0; i < itemImages.length; i++) set.add(`item_img_${i}`);
    }
    return set;
  }, [suggestedIds, sessionSelectedMediaIds, propertyImages, itemImages]);

  const toggle = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAutoAttach = useCallback((id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleLocalAssetAdded = useCallback(
    (asset: MediaAsset) => {
      setLocalGeneratedAssets((prev) => new Map(prev).set(asset.id, asset));
      onLocalAssetAdded(asset);
    },
    [onLocalAssetAdded],
  );

  const handleApply = () => {
    onMediaChange(Array.from(picked));
    onClose();
  };

  const tabs: { id: PostMediaTab; label: string; show: boolean }[] = [
    { id: 'suggested', label: 'Recommended', show: true },
    { id: 'library', label: 'Library', show: true },
    { id: 'generate', label: 'Generate', show: aiAvailable },
  ];

  return (
    <div className="border border-white-10 rounded-lg p-2.5 space-y-2">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {tabs
          .filter((t) => t.show)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'bg-accent-green-110 text-sp-bg'
                  : 'bg-white-5 text-white-40 hover:bg-white-10 hover:text-white-60',
              )}
            >
              {tab.label}
            </button>
          ))}
      </div>

      {/* Tab content */}
      {activeTab === 'suggested' && (
        <PostMediaTabSuggested
          propertyImages={propertyImages}
          itemImages={itemImages}
          sessionSelectedMediaIds={sessionSelectedMediaIds}
          suggestedIds={suggestedIds}
          assetMap={mergedAssetMap}
          picked={picked}
          onToggle={toggle}
        />
      )}

      {activeTab === 'library' && (
        <PostMediaTabLibrary
          clientId={clientId}
          assetMap={mergedAssetMap}
          propertyImages={propertyImages}
          itemImages={itemImages}
          suggestedIds={suggestedSet}
          picked={picked}
          onToggle={toggle}
        />
      )}

      {activeTab === 'generate' && aiAvailable && (
        <PostMediaTabGenerate
          clientId={clientId}
          defaultGuidance={defaultGuidance}
          aiImageAvailable={aiAvailable}
          assetMap={mergedAssetMap}
          picked={picked}
          onToggle={toggle}
          onLocalAssetAdded={handleLocalAssetAdded}
          onAutoAttach={handleAutoAttach}
        />
      )}

      {/* Apply / Cancel footer */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleApply}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green-110 text-sp-bg"
        >
          Apply ({picked.size})
        </button>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white-40 hover:bg-white-5"
        >
          Cancel
        </button>
      </div>

      {/* Asset preview modal */}
      {previewAsset && (
        <AssetPreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />
      )}
    </div>
  );
}
