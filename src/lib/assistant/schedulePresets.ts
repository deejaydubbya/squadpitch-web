import type { Channel } from '@/hooks/useSquadpitch';

// ── Types ───────────────────────────────────────────────────────────────

export interface CampaignSlotConfig {
  id: string;
  label: string;
  channel: string;
  campaignDay: number;
  purpose?: string;
}

export interface SequencePreset {
  key: string;
  label: string;
  description: string;
  slots: CampaignSlotConfig[];
}

// ── Hints ───────────────────────────────────────────────────────────────

export const SLOT_PURPOSE_HINTS: Record<string, string> = {
  'Launch Announcement': 'First impression — announce the listing with impact',
  'Feature Highlight': 'Showcase key property features and upgrades',
  'Lifestyle Story': 'Paint the lifestyle — who lives here, neighborhood feel',
  'Authority / Social Proof': 'Build trust — agent expertise, testimonials, market data',
  'Final Push': 'Create urgency — last chance, price anchoring, scarcity',
};

export const SLOT_MEDIA_HINTS: Record<string, string> = {
  'Launch Announcement': 'Best exterior / hero shot',
  'Feature Highlight': 'Kitchen, living room, or upgrades',
  'Lifestyle Story': 'Backyard, living room, or neighborhood',
  'Authority / Social Proof': 'Polished exterior or strong detail',
  'Final Push': 'Emotionally resonant or hero image',
};

// ── Default Slots ───────────────────────────────────────────────────────

export const DEFAULT_CAMPAIGN_SLOTS: CampaignSlotConfig[] = [
  { id: 'slot-1', label: 'Launch Announcement', channel: 'INSTAGRAM', campaignDay: 1, purpose: SLOT_PURPOSE_HINTS['Launch Announcement'] },
  { id: 'slot-2', label: 'Feature Highlight', channel: 'FACEBOOK', campaignDay: 2, purpose: SLOT_PURPOSE_HINTS['Feature Highlight'] },
  { id: 'slot-3', label: 'Lifestyle Story', channel: 'INSTAGRAM', campaignDay: 3, purpose: SLOT_PURPOSE_HINTS['Lifestyle Story'] },
  { id: 'slot-4', label: 'Authority / Social Proof', channel: 'LINKEDIN', campaignDay: 5, purpose: SLOT_PURPOSE_HINTS['Authority / Social Proof'] },
  { id: 'slot-5', label: 'Final Push', channel: 'FACEBOOK', campaignDay: 7, purpose: SLOT_PURPOSE_HINTS['Final Push'] },
];

// ── Presets ──────────────────────────────────────────────────────────────

export const SEQUENCE_PRESETS: SequencePreset[] = [
  {
    key: 'balanced',
    label: 'Balanced',
    description: '5 posts across 7 days — standard campaign',
    slots: DEFAULT_CAMPAIGN_SLOTS,
  },
  {
    key: 'aggressive',
    label: 'Aggressive Launch',
    description: '5 posts front-loaded in 4 days',
    slots: [
      { id: 'slot-1', label: 'Launch Announcement', channel: 'INSTAGRAM', campaignDay: 1, purpose: SLOT_PURPOSE_HINTS['Launch Announcement'] },
      { id: 'slot-2', label: 'Feature Highlight', channel: 'FACEBOOK', campaignDay: 1, purpose: SLOT_PURPOSE_HINTS['Feature Highlight'] },
      { id: 'slot-3', label: 'Lifestyle Story', channel: 'INSTAGRAM', campaignDay: 2, purpose: SLOT_PURPOSE_HINTS['Lifestyle Story'] },
      { id: 'slot-4', label: 'Authority / Social Proof', channel: 'LINKEDIN', campaignDay: 3, purpose: SLOT_PURPOSE_HINTS['Authority / Social Proof'] },
      { id: 'slot-5', label: 'Final Push', channel: 'FACEBOOK', campaignDay: 4, purpose: SLOT_PURPOSE_HINTS['Final Push'] },
    ],
  },
  {
    key: 'luxury',
    label: 'Luxury Storytelling',
    description: '5 posts spread over 10 days — slow build',
    slots: [
      { id: 'slot-1', label: 'Launch Announcement', channel: 'INSTAGRAM', campaignDay: 1, purpose: SLOT_PURPOSE_HINTS['Launch Announcement'] },
      { id: 'slot-2', label: 'Lifestyle Story', channel: 'INSTAGRAM', campaignDay: 3, purpose: SLOT_PURPOSE_HINTS['Lifestyle Story'] },
      { id: 'slot-3', label: 'Feature Highlight', channel: 'FACEBOOK', campaignDay: 5, purpose: SLOT_PURPOSE_HINTS['Feature Highlight'] },
      { id: 'slot-4', label: 'Authority / Social Proof', channel: 'LINKEDIN', campaignDay: 7, purpose: SLOT_PURPOSE_HINTS['Authority / Social Proof'] },
      { id: 'slot-5', label: 'Final Push', channel: 'FACEBOOK', campaignDay: 10, purpose: SLOT_PURPOSE_HINTS['Final Push'] },
    ],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Remap preset slots to only use available channels (round-robin fallback).
 */
export function buildSlotsForChannels(
  preset: SequencePreset,
  availableChannels: Channel[],
): CampaignSlotConfig[] {
  if (availableChannels.length === 0) return preset.slots;

  return preset.slots.map((slot, i) => {
    if (availableChannels.includes(slot.channel as Channel)) return slot;
    // Round-robin fallback to an available channel
    const fallback = availableChannels[i % availableChannels.length];
    return { ...slot, channel: fallback };
  });
}
