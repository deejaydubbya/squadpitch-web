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

  campaignSourceType: null,

  selectedPropertyId: null,
  propertyData: null,

  campaignDataItemId: null,
  campaignDataItemTitle: null,
  campaignDataItemType: null,
  campaignDataItemData: null,

  campaignIdea: null,

  // URL-02
  campaignSourceUrl: null,
  campaignUrlAnalyzeResult: null,

  campaignType: null,
  channels: [],
  scheduleMode: 'ai_proposed',
  slots: [],
  campaignStartDate: null,

  selectedMediaIds: [],
  mediaAcknowledged: false,
  heroImageId: null,

  quickPostSource: null,
  quickPostChannel: null,
  quickPostGuidance: null,
  quickPostKind: 'POST',
  quickPostGoal: null,
  quickPostContentType: null,
  quickPostDataItemId: null,
  quickPostDataItemTitle: null,
  quickPostBlueprintId: null,

  generationResult: null,

  fieldMeta: {},

  memory: INITIAL_MEMORY,
};

// ── Default Channels ─────────────────────────────────────────────────────

// Partial — callers fall back to the adapter table or
// GENERIC_DEFAULT_CHANNELS below when a key is missing.
export const DEFAULT_CHANNELS_BY_CAMPAIGN_TYPE: Partial<Record<AssistantCampaignType, Channel[]>> = {
  just_listed: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE'],
  open_house: ['INSTAGRAM', 'FACEBOOK', 'YOUTUBE'],
  price_drop: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
  general_promotion: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE'],
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

// ── Generic Cross-Industry Campaign Type Options ────────────────────────
// Shown when the campaign source is a Content Asset or an Idea
// (i.e. anything other than a property/listing). Industry-agnostic.

export const GENERIC_CAMPAIGN_TYPE_OPTIONS: CampaignTypeOption[] = [
  {
    value: 'awareness',
    label: 'Awareness Campaign',
    description: 'Build top-of-funnel attention for a topic, brand, or offer',
  },
  {
    value: 'lead_generation',
    label: 'Lead Generation Campaign',
    description: 'Drive sign-ups, inquiries, or DM conversations',
  },
  {
    value: 'educational',
    label: 'Educational Campaign',
    description: 'Teach your audience something useful in a sequence',
  },
  {
    value: 'promotion_offer',
    label: 'Promotion / Offer Campaign',
    description: 'Highlight a deal, discount, or limited-time offer',
  },
  {
    value: 'social_proof',
    label: 'Testimonial / Social Proof Campaign',
    description: 'Spotlight reviews, results, or case studies',
  },
  {
    value: 'event_announcement',
    label: 'Event / Announcement Campaign',
    description: 'Promote an upcoming event or company news',
  },
];

// Default channel sets for the generic types (mirrors the
// per-adapter table above; conservative picks that work for most
// industries).
export const GENERIC_DEFAULT_CHANNELS: Record<string, Channel[]> = {
  awareness: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
  lead_generation: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
  educational: ['INSTAGRAM', 'LINKEDIN', 'YOUTUBE'],
  promotion_offer: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
  social_proof: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
  event_announcement: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
};

// ── Adapter-Aware Helpers ───────────────────────────────────────────────

export function getCampaignTypeOptions(
  industryKey: string = 'real_estate',
  // URL-02: 'url' is accepted but produces no options — the URL
  // card is mid-flow at this point and the next state transition
  // (SET_PROPERTY) will flip the source to 'property' before the
  // campaign-type card needs real data.
  sourceType: 'property' | 'data_item' | 'idea' | 'url' | null = 'property',
): CampaignTypeOption[] {
  // Property source → adapter's industry-specific types (just_listed
  // etc. for real estate). Anything else → generic cross-industry list.
  if (sourceType === 'property') {
    return getAdapter(industryKey).campaignTypes;
  }
  if (sourceType === 'url') return [];
  return GENERIC_CAMPAIGN_TYPE_OPTIONS;
}

export function getDefaultChannels(campaignType: string, industryKey: string = 'real_estate'): Channel[] {
  return (
    getAdapter(industryKey).defaultChannelsByCampaignType[campaignType] ??
    GENERIC_DEFAULT_CHANNELS[campaignType] ??
    []
  );
}
