import { describe, it, expect } from 'vitest';
import {
  SEQUENCE_PRESETS,
  buildSlotsForChannels,
  buildSlotsFromStrategy,
  trimOrExpandSlots,
  DEFAULT_CAMPAIGN_SLOTS,
} from './schedulePresets';
import type { Channel } from '@/hooks/useSquadpitch';
import type { CampaignPhaseKey } from './campaignStrategy.types';

const CHANNELS: Channel[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'];

describe('trimOrExpandSlots', () => {
  it('returns slots unchanged when targetLength is null', () => {
    expect(trimOrExpandSlots(DEFAULT_CAMPAIGN_SLOTS, null)).toBe(
      DEFAULT_CAMPAIGN_SLOTS,
    );
  });

  it('returns slots unchanged when targetLength matches', () => {
    expect(trimOrExpandSlots(DEFAULT_CAMPAIGN_SLOTS, 5)).toBe(
      DEFAULT_CAMPAIGN_SLOTS,
    );
  });

  it('returns slots unchanged for unsupported lengths', () => {
    expect(trimOrExpandSlots(DEFAULT_CAMPAIGN_SLOTS, 4)).toBe(
      DEFAULT_CAMPAIGN_SLOTS,
    );
    expect(trimOrExpandSlots(DEFAULT_CAMPAIGN_SLOTS, 10)).toBe(
      DEFAULT_CAMPAIGN_SLOTS,
    );
  });

  it('trims a 5-slot preset down to 3 slots', () => {
    const out = trimOrExpandSlots(DEFAULT_CAMPAIGN_SLOTS, 3);
    expect(out.length).toBe(3);
    // First slot stays the launch announcement.
    expect(out[0].label).toBe('Launch Announcement');
    // Day numbers should still span the original window proportionally.
    expect(out[0].campaignDay).toBe(1);
    expect(out[out.length - 1].campaignDay).toBe(7);
  });

  it('expands a 5-slot preset up to 7 slots', () => {
    const out = trimOrExpandSlots(DEFAULT_CAMPAIGN_SLOTS, 7);
    expect(out.length).toBe(7);
    expect(out[0].label).toBe('Launch Announcement');
    expect(out[out.length - 1].label).toBe('Final Push');
    // Each slot gets a unique id.
    const ids = new Set(out.map((s) => s.id));
    expect(ids.size).toBe(7);
  });

  it('keeps phase ordering coherent when expanding', () => {
    const out = trimOrExpandSlots(DEFAULT_CAMPAIGN_SLOTS, 7);
    // First and last anchors come from the source.
    expect(out[0].label).toBe(DEFAULT_CAMPAIGN_SLOTS[0].label);
    expect(out[6].label).toBe(
      DEFAULT_CAMPAIGN_SLOTS[DEFAULT_CAMPAIGN_SLOTS.length - 1].label,
    );
  });
});

describe('buildSlotsForChannels with targetLength', () => {
  it('honors targetLength=3 with the balanced preset', () => {
    const preset = SEQUENCE_PRESETS.find((p) => p.key === 'balanced')!;
    const out = buildSlotsForChannels(preset, CHANNELS, 3);
    expect(out.length).toBe(3);
  });

  it('honors targetLength=7 with the aggressive preset', () => {
    const preset = SEQUENCE_PRESETS.find((p) => p.key === 'aggressive')!;
    const out = buildSlotsForChannels(preset, CHANNELS, 7);
    expect(out.length).toBe(7);
  });

  it('falls back to preset length when targetLength omitted', () => {
    const preset = SEQUENCE_PRESETS.find((p) => p.key === 'balanced')!;
    const out = buildSlotsForChannels(preset, CHANNELS);
    expect(out.length).toBe(preset.slots.length);
  });

  it('still round-robins through available channels after resizing', () => {
    const preset = SEQUENCE_PRESETS.find((p) => p.key === 'balanced')!;
    const out = buildSlotsForChannels(preset, ['INSTAGRAM'], 3);
    // With only one channel available, every slot lands on it.
    expect(out.every((s) => s.channel === 'INSTAGRAM')).toBe(true);
  });
});

describe('buildSlotsFromStrategy with targetLength', () => {
  const phases: CampaignPhaseKey[] = [
    'announcement',
    'feature',
    'lifestyle',
    'authority',
    'cta',
  ];

  it('produces 3 slots when targetLength=3', () => {
    const out = buildSlotsFromStrategy(phases, 'standard', CHANNELS, 3);
    expect(out.length).toBe(3);
    expect(out[0].phase).toBe('announcement');
    expect(out[out.length - 1].phase).toBe('cta');
  });

  it('produces 7 slots when targetLength=7', () => {
    const out = buildSlotsFromStrategy(phases, 'standard', CHANNELS, 7);
    expect(out.length).toBe(7);
    expect(out[0].phase).toBe('announcement');
    expect(out[out.length - 1].phase).toBe('cta');
  });

  it('keeps the original phase count when targetLength matches', () => {
    const out = buildSlotsFromStrategy(phases, 'standard', CHANNELS, 5);
    expect(out.length).toBe(5);
  });

  it('ignores invalid targetLength values', () => {
    const out = buildSlotsFromStrategy(phases, 'standard', CHANNELS, 4);
    expect(out.length).toBe(5);
  });
});
