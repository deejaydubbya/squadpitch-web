import type { MediaAsset } from '@/hooks/useSquadpitch';

type PropertyImageEntry = string | { url?: string; src?: string; imageUrl?: string; label?: string };

interface ThumbResult {
  url: string | undefined;
  isVideo: boolean;
  label: string;
}

/**
 * Resolve the thumbnail URL for a media ID. Handles:
 * - Real MediaAsset IDs (looked up in assetMap)
 * - Locally-added assets (from localAssets map, e.g. generated images)
 * - Synthetic property_img_N IDs (resolved from propertyImages array)
 * - Synthetic item_img_N IDs (resolved from itemImages array)
 */
export function resolveThumbUrl(
  id: string,
  assetMap: Map<string, MediaAsset>,
  propertyImages?: PropertyImageEntry[],
  itemImages?: PropertyImageEntry[]
): ThumbResult {
  // 1. Check assetMap (real media library assets + locally-added generated ones)
  const asset = assetMap.get(id);
  if (asset) {
    const isVideo = asset.assetType === 'video';
    const url = isVideo ? (asset.thumbnailUrl || asset.url) : (asset.url || asset.thumbnailUrl);
    return { url: url || undefined, isVideo, label: asset.filename || id };
  }

  // 2. Resolve synthetic property_img_N
  if (id.startsWith('property_img_')) {
    const idx = parseInt(id.replace('property_img_', ''), 10);
    const images = propertyImages ?? [];
    if (idx >= 0 && idx < images.length) {
      const entry = images[idx];
      const url = typeof entry === 'string'
        ? entry
        : (entry?.url || entry?.src || entry?.imageUrl);
      const label = typeof entry === 'string'
        ? `Property photo ${idx + 1}`
        : (entry?.label || `Property photo ${idx + 1}`);
      return { url: url || undefined, isVideo: false, label };
    }
    return { url: undefined, isVideo: false, label: `Property photo ${idx + 1}` };
  }

  // 3. Resolve synthetic item_img_N
  if (id.startsWith('item_img_')) {
    const idx = parseInt(id.replace('item_img_', ''), 10);
    const images = itemImages ?? [];
    if (idx >= 0 && idx < images.length) {
      const entry = images[idx];
      const url = typeof entry === 'string'
        ? entry
        : (entry?.url || entry?.src || entry?.imageUrl);
      return { url: url || undefined, isVideo: false, label: `Data item photo ${idx + 1}` };
    }
    return { url: undefined, isVideo: false, label: `Data item photo ${idx + 1}` };
  }

  // 4. Unknown ID — no thumbnail
  return { url: undefined, isVideo: false, label: id };
}
