import type { Channel } from '@/hooks/useSquadpitch';
import type { CampaignPhaseKey, CampaignCadenceKey } from './campaignStrategy.types';
import { CAMPAIGN_PHASES, CAMPAIGN_CADENCES } from './campaignStrategy';

// ── Types ───────────────────────────────────────────────────────────────

export interface CampaignSlotConfig {
  id: string;
  label: string;
  channel: string;
  campaignDay: number;
  purpose?: string;
  /** Campaign phase this slot represents (new strategy architecture) */
  phase?: CampaignPhaseKey;
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
  'Launch Announcement': 'Best exterior / cover photo',
  'Feature Highlight': 'Kitchen, living room, or upgrades',
  'Lifestyle Story': 'Backyard, living room, or neighborhood',
  'Authority / Social Proof': 'Polished exterior or strong detail',
  'Final Push': 'Emotionally resonant or cover photo',
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
 * Trim or expand a slot array to `targetLength` while preserving
 * phase ordering. Trimming keeps the first N slots (which start
 * with Launch Announcement and tend to be the strongest). Expansion
 * duplicates the existing Lifestyle / Feature / Authority slots in
 * rotation between the launch and final-push posts so the campaign
 * still feels phase-coherent.
 *
 * Returns `slots` unchanged if `targetLength` is the same length or
 * not in {3, 5, 7}.
 */
export function trimOrExpandSlots(
  slots: CampaignSlotConfig[],
  targetLength: number | null | undefined,
): CampaignSlotConfig[] {
  if (slots.length === 0) return slots;
  if (targetLength == null) return slots;
  if (![3, 5, 7].includes(targetLength)) return slots;
  if (slots.length === targetLength) return slots;

  if (targetLength < slots.length) {
    // Trim — keep the first N slots and renumber campaign days
    // so they span the original window proportionally. Day 1 stays
    // day 1; the last kept slot becomes the closing post.
    const kept = slots.slice(0, targetLength);
    const maxOriginalDay = Math.max(...slots.map((s) => s.campaignDay));
    return kept.map((s, i) => ({
      ...s,
      id: `slot-${i + 1}`,
      campaignDay:
        targetLength === 1
          ? 1
          : Math.round(1 + (i * (maxOriginalDay - 1)) / (targetLength - 1)),
    }));
  }

  // Expand — keep first slot (launch) and last slot (final push)
  // as anchors; fill the middle by cycling through the middle
  // phases. Day numbers spread evenly across the original window.
  const first = slots[0];
  const last = slots[slots.length - 1];
  const middle = slots.slice(1, slots.length - 1);
  if (middle.length === 0) {
    // Defensive — only 1 or 2 slots in the source preset. Just
    // duplicate the first slot to pad. Should not happen with the
    // 5-slot presets we ship today.
    const padded: CampaignSlotConfig[] = [];
    for (let i = 0; i < targetLength; i += 1) {
      padded.push({ ...first, id: `slot-${i + 1}`, campaignDay: i + 1 });
    }
    return padded;
  }

  const result: CampaignSlotConfig[] = [];
  const middleCount = targetLength - 2;
  result.push({ ...first, id: 'slot-1', campaignDay: 1 });
  for (let i = 0; i < middleCount; i += 1) {
    const source = middle[i % middle.length];
    result.push({
      ...source,
      id: `slot-${i + 2}`,
      // Distribute middle posts evenly between days 1 and
      // last.campaignDay. Each gets a unique day number.
      campaignDay: Math.round(
        1 +
          ((i + 1) * (last.campaignDay - 1)) / (targetLength - 1),
      ),
    });
  }
  result.push({
    ...last,
    id: `slot-${targetLength}`,
    campaignDay: last.campaignDay,
  });
  return result;
}

/**
 * Remap preset slots to only use available channels (round-robin fallback).
 * Optionally trims/expands to a target slot count so a workspace
 * with `defaultCampaignLength` set lands on 3/5/7 posts instead of
 * the fixed 5-post preset shape.
 */
export function buildSlotsForChannels(
  preset: SequencePreset,
  availableChannels: Channel[],
  targetLength?: number | null,
): CampaignSlotConfig[] {
  const sized = targetLength != null
    ? trimOrExpandSlots(preset.slots, targetLength)
    : preset.slots;

  if (availableChannels.length === 0) return sized;

  return sized.map((slot, i) => {
    if (availableChannels.includes(slot.channel as Channel)) return slot;
    // Round-robin fallback to an available channel
    const fallback = availableChannels[i % availableChannels.length];
    return { ...slot, channel: fallback };
  });
}

// ── Strategy-Driven Slot Generation ──────────────────────────────────────

/**
 * Build campaign slots from a strategy's phase sequence + cadence timing.
 * This is the new phase-driven alternative to the fixed presets above.
 *
 * Each phase becomes a slot, cadence determines the day spacing,
 * and channels are assigned via round-robin from available channels.
 */
export function buildSlotsFromStrategy(
  phases: CampaignPhaseKey[],
  cadenceKey: CampaignCadenceKey,
  availableChannels: Channel[],
  targetLength?: number | null,
): CampaignSlotConfig[] {
  // Optionally trim/expand the phase list before computing the day
  // spacing so a 3-post campaign actually gets 3 phases (keeping
  // the first, last, and proportionally-selected middles) and a
  // 7-post campaign gets 7. Length 5 with a 5-phase strategy is a
  // no-op.
  const sizedPhases: CampaignPhaseKey[] =
    targetLength != null && [3, 5, 7].includes(targetLength)
      ? resizePhases(phases, targetLength)
      : phases;

  const cadence = CAMPAIGN_CADENCES[cadenceKey];
  const days = cadence.computeDays(sizedPhases.length);

  return sizedPhases.map((phaseKey, i) => {
    const phase = CAMPAIGN_PHASES[phaseKey];
    const channel = availableChannels.length > 0
      ? availableChannels[i % availableChannels.length]
      : 'INSTAGRAM'; // fallback

    return {
      id: `slot-${i + 1}`,
      label: phase.label,
      channel,
      campaignDay: days[i],
      purpose: phase.objective,
      phase: phaseKey,
    };
  });
}

// Resize a phase list while keeping the first phase (the
// announcement) and the last phase (the final push / reminder) as
// anchors. Middle phases are sampled proportionally.
function resizePhases(
  phases: CampaignPhaseKey[],
  targetLength: number,
): CampaignPhaseKey[] {
  if (phases.length === 0) return phases;
  if (phases.length === targetLength) return phases;
  if (targetLength === 1) return [phases[0]];

  const first = phases[0];
  const last = phases[phases.length - 1];
  if (targetLength === 2) return [first, last];

  const middle = phases.slice(1, phases.length - 1);
  if (middle.length === 0) {
    // No middle phases to sample — pad with the first phase.
    const padded: CampaignPhaseKey[] = [first];
    for (let i = 0; i < targetLength - 2; i += 1) padded.push(first);
    padded.push(last);
    return padded;
  }

  const middleCount = targetLength - 2;
  const result: CampaignPhaseKey[] = [first];
  for (let i = 0; i < middleCount; i += 1) {
    // Stride through the middle proportionally so a 3-post
    // campaign picks the middle middle phase, a 7-post campaign
    // picks 5 middles spread evenly including repeats if needed.
    const idx = Math.min(
      middle.length - 1,
      Math.floor((i * middle.length) / middleCount),
    );
    result.push(middle[idx]);
  }
  result.push(last);
  return result;
}
