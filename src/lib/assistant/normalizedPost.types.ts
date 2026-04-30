import type {
  Channel,
  DraftKind,
  CampaignAngle,
  CampaignSlotType,
  CampaignPost,
  Draft,
  ScoredHook,
  MediaPlan,
} from '@/hooks/useSquadpitch';

// ── Normalized Post Model ─────────────────────────────────────────────
// A unified representation for both campaign posts and quick posts during
// the review/editing phase. Adapters convert to and from this model so
// shared UI components can work identically on either flow.

export interface PostVersion {
  id: string;
  label: string;
  body: string;
  hooks: string[];
  hashtags: string[];
  cta: string | null;
  score: PostScore | null;
}

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  maxPoints: number;
  isPositive: boolean;
  grade: 'strong' | 'decent' | 'weak' | 'missing';
}

export interface PostScore {
  value: number;
  max: 10;
  breakdown: ScoreBreakdownItem[];
}

export type MediaSource = 'auto_assigned' | 'user_selected' | 'ai_generated';
export type MediaDisplayType = 'single' | 'carousel';

export interface PostMediaRef {
  id: string;
  source: MediaSource;
}

export type DataAwarenessLevel = 'uses_user_data' | 'general_content' | 'missing_data';

export interface DataAwareness {
  level: DataAwarenessLevel;
  sourceId?: string;
  sourceTitle?: string;
  sourceType?: string;
  dataSourcesUsed: string[];
}

export type NormalizedPostStatus = 'reviewing' | 'edited' | 'approved' | 'saved';

export interface CampaignMeta {
  campaignDay: number;
  angle: CampaignAngle;
  label: string;
  subject: string;
  imageHint?: string;
  campaignName?: string;
  slotType?: CampaignSlotType;
}

export interface NormalizedPost {
  id: string;
  sourceType: 'campaign' | 'quick_post';
  category: DraftKind | CampaignSlotType;
  selectedVersionId: string;
  bestVersionId: string;
  versions: PostVersion[];
  score: PostScore | null;
  scoredHooks: ScoredHook[] | null;
  media: PostMediaRef[];
  primaryMediaId: string | null;
  mediaDisplayType: MediaDisplayType;
  mediaMatchExplanation: string | null;
  dataAwareness: DataAwareness | null;
  channels: Channel[];
  status: NormalizedPostStatus;
  campaignMeta: CampaignMeta | null;
  mediaPlan: MediaPlan | null;

  /** Preserved original for the reverse adapter (campaign flow) */
  _originalCampaignPost?: CampaignPost;
  /** Preserved original for the reverse adapter (quick post flow) */
  _originalDraft?: Draft;
}
