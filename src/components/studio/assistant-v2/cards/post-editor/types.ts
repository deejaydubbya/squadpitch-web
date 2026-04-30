import type { ScoredHook, MediaAsset } from '@/hooks/useSquadpitch';
import type { NormalizedPost, PostScore } from '@/lib/assistant/normalizedPost.types';
import type { ImproveState } from './usePostEditorState';
import type { TextImproveActionId, MediaImproveActionId } from '@/lib/assistant/improveActions';

// ── Shared props for post-editor subcomponents ──────────────────────

export interface VersionSelectorProps {
  versions: NormalizedPost['versions'];
  selectedVersionId: string;
  onSelectVersion: (versionId: string) => void;
}

export interface VersionPickerProps {
  versions: NormalizedPost['versions'];
  selectedId: string;
  bestVersionId: string;
  onSelect: (versionId: string) => void;
}

export interface PostScoreMeterProps {
  score: PostScore;
}

export interface HooksRankingProps {
  hooks: ScoredHook[];
  hasScored: boolean;
  onUseHook: (hookText: string) => void;
}

export interface PostMediaStripProps {
  mediaIds: string[];
  assetMap: Map<string, MediaAsset>;
  propertyImages: Array<string | { url?: string; src?: string; imageUrl?: string; label?: string }>;
  itemImages?: Array<string | { url?: string; label?: string }>;
  maxVisible?: number;
  thumbSize?: 'sm' | 'md';
  onRemove: (id: string) => void;
  onPreview: (asset: MediaAsset) => void;
  onTogglePicker: () => void;
  emptyLabel?: string;
}

export interface PostEditorCardProps {
  normalizedPost: NormalizedPost;
  bestVersionId: string;
  editedBody: string;
  editedCta: string;
  editedHashtags: string;
  onBodyChange: (body: string) => void;
  onCtaChange: (cta: string) => void;
  onHashtagsChange: (hashtags: string) => void;
  onSelectVersion: (versionId: string) => void;
  score: PostScore;
  hooks: ScoredHook[];
  hasScored: boolean;
  onUseHook: (hookText: string) => void;
  // Improve actions (optional — backward compatible)
  improveState?: ImproveState;
  onTextImprove?: (actionId: TextImproveActionId) => void;
  onMediaImprove?: (actionId: MediaImproveActionId) => void;
  onDismissImproveError?: () => void;
  hasUserEdits?: boolean;
  atImageLimit?: boolean;
  atVideoLimit?: boolean;
}
