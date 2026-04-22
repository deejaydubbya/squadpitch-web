import type { MediaAsset } from '@/hooks/useSquadpitch';

export type MediaSource = 'property' | 'library' | 'upload' | 'recent' | 'item';

export type TabId = 'context' | 'recent' | 'library' | 'upload' | 'generate';

export interface SelectableImage {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  source: MediaSource;
  label?: string;
  tags?: string[];
  qualityScore?: number | null;
  asset?: MediaAsset;
  assetType?: 'image' | 'video';
  videoDurationSec?: number | null;
}

export type MediaTypeFilter = 'all' | 'image' | 'video';

export interface MediaTabProps {
  clientId: string;
  selected: Set<string>;
  heroId: string | null;
  onToggle: (id: string) => void;
  onToggleHero: (id: string) => void;
  onPreview: (img: SelectableImage) => void;
  priorityScoreMap: Map<string, number>;
  mediaTypeFilter?: MediaTypeFilter;
}
