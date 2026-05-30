// Spinstr03 — command-center pure-helper tests.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AutopilotCampaignRecommendation } from '@/hooks/useSquadpitch';
import { pickHero, lastScanLabel } from './commandCenter.helpers';

function rec(
  partial: Partial<AutopilotCampaignRecommendation> & {
    id: string;
    status: AutopilotCampaignRecommendation['status'];
    confidence: AutopilotCampaignRecommendation['confidence'];
    triggeredAt: string;
  },
): AutopilotCampaignRecommendation {
  return {
    id: partial.id,
    clientId: 'c1',
    status: partial.status,
    triggerType: partial.triggerType ?? 'new_listing',
    triggerReason: partial.triggerReason ?? 'A reason',
    triggeredAt: partial.triggeredAt,
    listingDataItemId: partial.listingDataItemId ?? 'li1',
    propertyTitle: partial.propertyTitle ?? 'Title',
    propertyAddress: partial.propertyAddress ?? null,
    propertyData: partial.propertyData ?? {},
    propertyImageUrl: partial.propertyImageUrl ?? null,
    suggestedCampaignType: partial.suggestedCampaignType ?? 'just_listed',
    confidence: partial.confidence,
    suggestedChannels: partial.suggestedChannels ?? [],
    generatedCampaign: null,
    postCount: partial.postCount ?? null,
    approvedCampaignId: null,
    createdAt: partial.createdAt ?? partial.triggeredAt,
    expiresAt: partial.expiresAt ?? null,
  };
}

describe('pickHero', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null on empty list', () => {
    expect(pickHero([])).toBeNull();
  });

  it('returns null when only dismissed/expired remain', () => {
    const recs = [
      rec({ id: 'a', status: 'dismissed', confidence: 'high', triggeredAt: '2026-05-18T11:00:00Z' }),
      rec({ id: 'b', status: 'expired', confidence: 'high', triggeredAt: '2026-05-18T11:00:00Z' }),
    ];
    expect(pickHero(recs)).toBeNull();
  });

  it('prefers pending over ready over approved', () => {
    const recs = [
      rec({ id: 'approved', status: 'approved', confidence: 'high', triggeredAt: '2026-05-18T11:00:00Z' }),
      rec({ id: 'pending', status: 'pending', confidence: 'low', triggeredAt: '2026-05-18T11:00:00Z' }),
      rec({ id: 'ready', status: 'ready', confidence: 'high', triggeredAt: '2026-05-18T11:00:00Z' }),
    ];
    expect(pickHero(recs)?.id).toBe('pending');
  });

  it('breaks ties on confidence then recency', () => {
    const recs = [
      rec({ id: 'low', status: 'pending', confidence: 'low', triggeredAt: '2026-05-18T11:00:00Z' }),
      rec({ id: 'medium', status: 'pending', confidence: 'medium', triggeredAt: '2026-05-18T11:00:00Z' }),
      rec({ id: 'high-old', status: 'pending', confidence: 'high', triggeredAt: '2026-05-10T11:00:00Z' }),
      rec({ id: 'high-new', status: 'pending', confidence: 'high', triggeredAt: '2026-05-18T11:00:00Z' }),
    ];
    expect(pickHero(recs)?.id).toBe('high-new');
  });

  it('falls back to ready when no pending exists', () => {
    const recs = [
      rec({ id: 'r1', status: 'ready', confidence: 'medium', triggeredAt: '2026-05-18T11:00:00Z' }),
      rec({ id: 'a1', status: 'approved', confidence: 'high', triggeredAt: '2026-05-18T11:00:00Z' }),
    ];
    expect(pickHero(recs)?.id).toBe('r1');
  });
});

describe('lastScanLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Never" for null', () => {
    expect(lastScanLabel(null)).toBe('Never');
  });

  it('returns "Just now" for < 1 minute', () => {
    expect(lastScanLabel('2026-05-18T11:59:30Z')).toBe('Just now');
  });

  it('returns minute granularity under an hour', () => {
    expect(lastScanLabel('2026-05-18T11:45:00Z')).toBe('15m ago');
    expect(lastScanLabel('2026-05-18T11:01:00Z')).toBe('59m ago');
  });

  it('flips to hour granularity at exactly 60 minutes', () => {
    expect(lastScanLabel('2026-05-18T11:00:00Z')).toBe('1h ago');
  });

  it('returns hour granularity under a day', () => {
    expect(lastScanLabel('2026-05-18T09:00:00Z')).toBe('3h ago');
  });

  it('returns day granularity past 24h', () => {
    expect(lastScanLabel('2026-05-15T12:00:00Z')).toBe('3d ago');
  });
});
