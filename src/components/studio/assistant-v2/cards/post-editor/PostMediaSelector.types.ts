import type { MediaAsset, MediaPlan } from '@/hooks/useSquadpitch';

// ── Badge types ────────────────────────────────────────────────────────

export type PostMediaBadge = 'Suggested' | 'Library' | 'Uploaded' | 'AI Image' | 'AI Video';

export const BADGE_COLORS: Record<PostMediaBadge, string> = {
  Suggested: 'bg-zone-green/20 text-zone-green',
  Library: 'bg-white-10 text-white-60',
  Uploaded: 'bg-zone-blue/20 text-zone-blue',
  'AI Image': 'bg-purple-500/20 text-purple-400',
  'AI Video': 'bg-purple-500/20 text-purple-400',
};

/**
 * Classify a media ID into a badge category.
 */
export function resolveMediaBadge(
  id: string,
  assetMap: Map<string, MediaAsset>,
  suggestedIds: Set<string>,
): PostMediaBadge {
  if (suggestedIds.has(id)) return 'Suggested';

  const asset = assetMap.get(id);
  if (asset) {
    if (asset.source === 'AI_GENERATED') {
      return asset.assetType === 'video' ? 'AI Video' : 'AI Image';
    }
    if (asset.source === 'UPLOAD') return 'Uploaded';
    return 'Library';
  }

  // Synthetic IDs are always "Suggested"
  if (id.startsWith('property_img_') || id.startsWith('item_img_')) return 'Suggested';

  return 'Library';
}

// ── Suggestion type ────────────────────────────────────────────────────

export interface PostMediaSuggestion {
  id: string;
  reason?: string;
}

// ── Selector props ─────────────────────────────────────────────────────

export type PostMediaTab = 'suggested' | 'library' | 'generate';

export interface PostMediaSelectorProps {
  clientId: string;
  mediaIds: string[];
  onMediaChange: (ids: string[]) => void;
  assetMap: Map<string, MediaAsset>;
  propertyImages: Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>;
  itemImages?: Array<string | { url?: string; label?: string }>;
  suggestedIds?: PostMediaSuggestion[];
  sessionSelectedMediaIds?: string[];
  aiAvailable: boolean;
  defaultGuidance?: string;
  mediaPlan?: MediaPlan;
  onLocalAssetAdded: (asset: MediaAsset) => void;
  onClose: () => void;
}
