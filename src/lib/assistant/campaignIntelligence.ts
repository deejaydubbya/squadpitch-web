import type { Channel, MediaAsset } from '@/hooks/useSquadpitch';
import {
  buildSlotsForChannels,
} from './schedulePresets';
import type {
  CampaignTypeRecommendation,
  ChannelRecommendation,
  RecommendChannelsInput,
  PrioritizeMediaInput,
  MediaPrioritization,
  BuildScheduleInput,
  ScheduleRecommendation,
} from './campaignIntelligence.types';
import { getAdapter } from './adapterRegistry';
import type { IndustryAdapter } from './industryAdapter';

// ── 1. recommendCampaignType ────────────────────────────────────────────

export function recommendCampaignType(
  propertyData: Record<string, unknown>,
  adapter: IndustryAdapter = getAdapter('real_estate'),
): CampaignTypeRecommendation {
  return adapter.recommendCampaignType(propertyData);
}

// ── 2. recommendChannels ────────────────────────────────────────────────

export function recommendChannels(
  input: RecommendChannelsInput,
  adapter: IndustryAdapter = getAdapter('real_estate'),
): ChannelRecommendation {
  return adapter.recommendChannels(input);
}

// ── 3. prioritizeMedia ──────────────────────────────────────────────────

export function prioritizeMedia(
  assets: MediaAsset[],
  input: PrioritizeMediaInput,
  adapter: IndustryAdapter = getAdapter('real_estate'),
): MediaPrioritization {
  return adapter.prioritizeMedia(assets, input);
}

// ── 4. buildIntelligentSchedule ─────────────────────────────────────────

export function buildIntelligentSchedule(
  input: BuildScheduleInput,
  adapter: IndustryAdapter = getAdapter('real_estate'),
): ScheduleRecommendation {
  const { campaignType, channels, propertyData } = input;

  const { presetKey, reason: cadenceReason } = adapter.scheduleStrategy.selectPreset(campaignType, propertyData);
  const preset = adapter.scheduleStrategy.presets.find((p) => p.key === presetKey) ?? adapter.scheduleStrategy.presets[0];

  // Apply channel distribution rules
  let slots = buildSlotsForChannels(preset, channels);

  // Instagram gets Day 1 (visual impact) — swap if needed
  if (channels.includes('INSTAGRAM' as Channel)) {
    const igSlotIdx = slots.findIndex((s) => s.channel === 'INSTAGRAM');
    const day1Idx = slots.findIndex((s) => s.campaignDay === 1);
    if (igSlotIdx !== -1 && day1Idx !== -1 && igSlotIdx !== day1Idx) {
      const igChannel = slots[igSlotIdx].channel;
      const day1Channel = slots[day1Idx].channel;
      slots = slots.map((s, i) => {
        if (i === igSlotIdx) return { ...s, channel: day1Channel };
        if (i === day1Idx) return { ...s, channel: igChannel };
        return s;
      });
    }
  }

  // LinkedIn never on Day 1 — swap with next available
  if (channels.includes('LINKEDIN' as Channel)) {
    const day1LiIdx = slots.findIndex((s) => s.campaignDay === 1 && s.channel === 'LINKEDIN');
    if (day1LiIdx !== -1) {
      const swapIdx = slots.findIndex((s, i) => i !== day1LiIdx && s.channel !== 'LINKEDIN');
      if (swapIdx !== -1) {
        const liChannel = slots[day1LiIdx].channel;
        const swapChannel = slots[swapIdx].channel;
        slots = slots.map((s, i) => {
          if (i === day1LiIdx) return { ...s, channel: swapChannel };
          if (i === swapIdx) return { ...s, channel: liChannel };
          return s;
        });
      }
    }
  }

  return { preset: presetKey, slots, cadenceReason };
}
