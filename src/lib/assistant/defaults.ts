import type { Channel } from '@/hooks/useSquadpitch';
import type { AssistantCampaignType, AssistantSessionState, SessionMemory } from './types';
import { getAdapter } from './adapterRegistry';
import type { CampaignTypeOption } from './industryAdapter';

// ── Initial Memory ──────────────────────────────────────────────────────

export const INITIAL_MEMORY: SessionMemory = {
  preferredCampaignType: null,
  preferredChannels: [],
  preferredPreset: null,
  lastSelectedMediaIds: [],
  campaignsCompleted: 0,
};

// ── Initial Session ──────────────────────────────────────────────────────

export const INITIAL_SESSION: AssistantSessionState = {
  mode: null,
  industryKey: 'real_estate',
  workspaceId: null,

  selectedPropertyId: null,
  propertyData: null,

  campaignType: null,
  channels: [],
  scheduleMode: 'ai_proposed',
  slots: [],

  selectedMediaIds: [],
  mediaAcknowledged: false,

  quickPostChannel: null,
  quickPostGuidance: null,
  quickPostKind: 'POST',

  generationResult: null,

  memory: INITIAL_MEMORY,
};

// ── Default Channels ─────────────────────────────────────────────────────

export const DEFAULT_CHANNELS_BY_CAMPAIGN_TYPE: Record<AssistantCampaignType, Channel[]> = {
  just_listed: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
  open_house: ['INSTAGRAM', 'FACEBOOK'],
  price_drop: ['INSTAGRAM', 'FACEBOOK'],
  general_promotion: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
};

// ── Campaign Type Options ────────────────────────────────────────────────

export const CAMPAIGN_TYPE_OPTIONS: Array<{
  value: AssistantCampaignType;
  label: string;
  description: string;
}> = [
  {
    value: 'just_listed',
    label: 'Just Listed',
    description: 'Announce a new listing across multiple channels',
  },
  {
    value: 'open_house',
    label: 'Open House',
    description: 'Promote an upcoming open house event',
  },
  {
    value: 'price_drop',
    label: 'Price Drop',
    description: 'Highlight a price reduction to drive urgency',
  },
  {
    value: 'general_promotion',
    label: 'General Promotion',
    description: 'Spotlight a listing with flexible messaging',
  },
];

// ── Adapter-Aware Helpers ───────────────────────────────────────────────

export function getCampaignTypeOptions(industryKey: string = 'real_estate'): CampaignTypeOption[] {
  return getAdapter(industryKey).campaignTypes;
}

export function getDefaultChannels(campaignType: string, industryKey: string = 'real_estate'): Channel[] {
  return getAdapter(industryKey).defaultChannelsByCampaignType[campaignType] ?? [];
}
