import type { Channel, DraftKind, Draft, ListingCampaignResult } from '@/hooks/useSquadpitch';

// ── Session Memory ──────────────────────────────────────────────────────

export interface SessionMemory {
  /** Last campaign type the user explicitly selected */
  preferredCampaignType: AssistantCampaignType | null;
  /** Channels the user has toggled on most recently */
  preferredChannels: Channel[];
  /** Last schedule preset the user chose */
  preferredPreset: string | null;
  /** Media IDs the user has manually selected (last session) */
  lastSelectedMediaIds: string[];
  /** Number of campaigns completed in this session (for confidence) */
  campaignsCompleted: number;
}

// ── Enums / Unions ───────────────────────────────────────────────────────

export type AssistantMode = 'campaign' | 'quick_post';

export type IndustryKey = 'real_estate' | (string & {});

export type AssistantCampaignType =
  | 'just_listed'
  | 'open_house'
  | 'price_drop'
  | 'general_promotion';

export type ScheduleMode = 'ai_proposed' | 'manual';

export type AssistantStepId =
  | 'mode_select'
  | 'property_select'
  | 'campaign_config'
  | 'quick_post_config'
  | 'media_select'
  | 'schedule_review'
  | 'generate';

// ── Workflow ─────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: AssistantStepId;
  label: string;
  modes: AssistantMode[];
  required: (keyof AssistantSessionState)[];
}

// ── Session State ────────────────────────────────────────────────────────

export interface ScheduleSlot {
  channel: Channel;
  campaignDay: number;
  label?: string;
  slotType?: string;
  angle?: string;
}

export interface AssistantSessionState {
  mode: AssistantMode | null;
  industryKey: IndustryKey;
  workspaceId: string | null;

  // Property
  selectedPropertyId: string | null;
  propertyData: Record<string, unknown> | null;

  // Campaign config
  campaignType: AssistantCampaignType | null;
  channels: Channel[];
  scheduleMode: ScheduleMode;
  slots: ScheduleSlot[];

  // Media
  selectedMediaIds: string[];
  mediaAcknowledged: boolean;

  // Quick post
  quickPostChannel: Channel | null;
  quickPostGuidance: string | null;
  quickPostKind: DraftKind;

  // Generation result (stored for contract building)
  generationResult: Draft | ListingCampaignResult | null;

  // Session memory (survives resets)
  memory: SessionMemory;
}

// ── Picker Options ───────────────────────────────────────────────────────

export interface PropertyOption {
  id: string;
  title: string;
  address?: string;
  imageUrl?: string;
  dataJson: Record<string, unknown>;
}

export interface MediaOption {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  assetType: 'image' | 'video';
}

// ── Reducer Actions ──────────────────────────────────────────────────────

export type AssistantAction =
  | { type: 'SET_MODE'; payload: AssistantMode }
  | { type: 'SET_PROPERTY'; payload: { id: string; data: Record<string, unknown> } }
  | { type: 'CLEAR_PROPERTY' }
  | { type: 'SET_CAMPAIGN_TYPE'; payload: AssistantCampaignType }
  | { type: 'SET_CHANNELS'; payload: Channel[]; source?: 'user' | 'auto' }
  | { type: 'SET_SCHEDULE_MODE'; payload: ScheduleMode }
  | { type: 'SET_SLOTS'; payload: ScheduleSlot[] }
  | { type: 'SET_MEDIA'; payload: string[] }
  | { type: 'SET_MEDIA_ACKNOWLEDGED' }
  | { type: 'SET_QUICK_POST_CHANNEL'; payload: Channel }
  | { type: 'SET_QUICK_POST_GUIDANCE'; payload: string }
  | { type: 'SET_QUICK_POST_KIND'; payload: DraftKind }
  | { type: 'SET_GENERATION_RESULT'; payload: Draft | ListingCampaignResult | null }
  | { type: 'SET_PREFERRED_PRESET'; payload: string }
  | { type: 'RESET' };
