// industry-01 — adapter registry must NOT silently fall back to
// the real-estate adapter for unknown/missing industry keys.
// A no-industry workspace renders neutral UI; getAdapterSafe
// returns null so callers handle the null case explicitly.

import { describe, it, expect } from 'vitest';
import {
  getAdapter,
  getAdapterSafe,
  getCampaignTypeLabel,
} from './adapterRegistry';

describe('getAdapter', () => {
  it('returns the real_estate adapter when asked for it', () => {
    const a = getAdapter('real_estate');
    expect(a.id).toBe('real_estate');
  });

  it('throws on an unknown industry key', () => {
    expect(() => getAdapter('not_an_industry')).toThrow();
  });

  it('throws on null / undefined / empty industry key', () => {
    expect(() => getAdapter(null)).toThrow();
    expect(() => getAdapter(undefined)).toThrow();
    expect(() => getAdapter('')).toThrow();
  });
});

describe('getAdapterSafe — industry-01 no-silent-fallback', () => {
  it('returns the real_estate adapter for known keys', () => {
    expect(getAdapterSafe('real_estate')?.id).toBe('real_estate');
  });

  it('returns null for unknown industry keys (was silently real_estate)', () => {
    expect(getAdapterSafe('not_an_industry')).toBeNull();
  });

  it('returns null for null / undefined / empty input', () => {
    expect(getAdapterSafe(null)).toBeNull();
    expect(getAdapterSafe(undefined)).toBeNull();
    expect(getAdapterSafe('')).toBeNull();
  });
});

describe('getCampaignTypeLabel — no real-estate default', () => {
  it('uses adapter label when industryKey + value match', () => {
    // just_listed is a real-estate adapter campaign type.
    expect(getCampaignTypeLabel('just_listed', 'real_estate')).toBe('Just Listed');
  });

  it('returns the bare value with underscores stripped when no industryKey is set', () => {
    expect(getCampaignTypeLabel('just_listed', null)).toBe('just listed');
    expect(getCampaignTypeLabel('open_house', undefined)).toBe('open house');
  });

  it('returns the bare value when the industry adapter is unknown', () => {
    expect(getCampaignTypeLabel('just_listed', 'made_up_industry')).toBe('just listed');
  });
});
