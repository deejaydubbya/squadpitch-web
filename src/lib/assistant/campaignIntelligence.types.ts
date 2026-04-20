import type { Channel } from '@/hooks/useSquadpitch';
import type { AssistantCampaignType } from './types';
import type { CampaignSlotConfig } from './schedulePresets';

// ── Confidence Level ────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// ── Campaign Type Recommendation ────────────────────────────────────────

export interface CampaignTypeRecommendation {
  recommended: AssistantCampaignType;
  confidence: ConfidenceLevel;
  reason: string;
  alternatives: AssistantCampaignType[];
}

// ── Channel Recommendation ──────────────────────────────────────────────

export interface ChannelRecommendation {
  recommended: Channel[];
  reasoning: Record<string, string>;
}

// ── Media Prioritization ────────────────────────────────────────────────

export interface MediaPriorityItem {
  id: string;
  score: number;
  reason: string;
}

export interface MediaPrioritization {
  prioritized: MediaPriorityItem[];
  heroImageId: string | null;
}

// ── Schedule Recommendation ─────────────────────────────────────────────

export interface ScheduleRecommendation {
  preset: string;
  slots: CampaignSlotConfig[];
  cadenceReason: string;
}

// ── Function Input Types ────────────────────────────────────────────────

export interface RecommendChannelsInput {
  campaignType: AssistantCampaignType;
  connectedChannels: Channel[];
  hasMedia: boolean;
  propertyData: Record<string, unknown>;
}

export interface PrioritizeMediaInput {
  campaignType: AssistantCampaignType;
  slotCount: number;
}

export interface BuildScheduleInput {
  campaignType: AssistantCampaignType;
  channels: Channel[];
  propertyData: Record<string, unknown>;
}
