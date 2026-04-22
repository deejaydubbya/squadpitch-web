import type { Channel, MediaAsset } from '@/hooks/useSquadpitch';
import {
  buildSlotsForChannels,
  buildSlotsFromStrategy,
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
import { CADENCE_TO_LEGACY_PRESET } from './campaignStrategy.types';
import { buildStrategyExplanation } from './campaignStrategy';

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

  // Use new strategy resolution if available, fall back to legacy preset selection
  const hasStrategySupport = !!adapter.scheduleStrategy.resolveStrategy;

  let slots;
  let presetKey: string;
  let cadenceReason: string;
  let strategyResult: ScheduleRecommendation['strategy'];
  let cadenceResult: ScheduleRecommendation['cadence'];
  let phasesResult: ScheduleRecommendation['phases'];
  let strategyReason: string | undefined;
  let strategyExplanation: string | undefined;

  if (hasStrategySupport) {
    const resolution = adapter.scheduleStrategy.resolveStrategy!(campaignType, propertyData);
    slots = buildSlotsFromStrategy(resolution.phases, resolution.cadence, channels);
    presetKey = CADENCE_TO_LEGACY_PRESET[resolution.cadence]; // backward compat
    cadenceReason = resolution.cadenceReason;
    strategyResult = resolution.strategy;
    cadenceResult = resolution.cadence;
    phasesResult = resolution.phases;
    strategyReason = resolution.strategyReason;
    strategyExplanation = buildStrategyExplanation(resolution.strategy, resolution.cadence);
  } else {
    // Legacy path: use preset-based selection
    const { presetKey: selectedPreset, reason } = adapter.scheduleStrategy.selectPreset(campaignType, propertyData);
    presetKey = selectedPreset;
    cadenceReason = reason;
    const preset = adapter.scheduleStrategy.presets.find((p) => p.key === selectedPreset) ?? adapter.scheduleStrategy.presets[0];
    slots = buildSlotsForChannels(preset, channels);
  }

  // Apply channel distribution rules
  slots = applyChannelRules(slots, channels);

  return {
    preset: presetKey,
    slots,
    cadenceReason,
    strategy: strategyResult,
    cadence: cadenceResult,
    phases: phasesResult,
    strategyReason,
    strategyExplanation,
  };
}

// ── Channel Distribution Rules ──────────────────────────────────────────

function applyChannelRules(
  slots: ReturnType<typeof buildSlotsForChannels>,
  channels: Channel[],
) {
  let result = [...slots];

  // Instagram gets Day 1 (visual impact) — swap if needed
  if (channels.includes('INSTAGRAM' as Channel)) {
    const igSlotIdx = result.findIndex((s) => s.channel === 'INSTAGRAM');
    const day1Idx = result.findIndex((s) => s.campaignDay === 1);
    if (igSlotIdx !== -1 && day1Idx !== -1 && igSlotIdx !== day1Idx) {
      const igChannel = result[igSlotIdx].channel;
      const day1Channel = result[day1Idx].channel;
      result = result.map((s, i) => {
        if (i === igSlotIdx) return { ...s, channel: day1Channel };
        if (i === day1Idx) return { ...s, channel: igChannel };
        return s;
      });
    }
  }

  // LinkedIn never on Day 1 — swap with next available
  if (channels.includes('LINKEDIN' as Channel)) {
    const day1LiIdx = result.findIndex((s) => s.campaignDay === 1 && s.channel === 'LINKEDIN');
    if (day1LiIdx !== -1) {
      const swapIdx = result.findIndex((s, i) => i !== day1LiIdx && s.channel !== 'LINKEDIN');
      if (swapIdx !== -1) {
        const liChannel = result[day1LiIdx].channel;
        const swapChannel = result[swapIdx].channel;
        result = result.map((s, i) => {
          if (i === day1LiIdx) return { ...s, channel: swapChannel };
          if (i === swapIdx) return { ...s, channel: liChannel };
          return s;
        });
      }
    }
  }

  return result;
}
