// industry-02 — locks in the no-industry safe defaults from
// industry-01.

import { describe, it, expect } from 'vitest';
import {
  INITIAL_SESSION,
  getCampaignTypeOptions,
  getDefaultChannels,
  GENERIC_CAMPAIGN_TYPE_OPTIONS,
} from './defaults';

describe('INITIAL_SESSION industry-01 default', () => {
  it('industryKey is null (was hardcoded "real_estate")', () => {
    expect(INITIAL_SESSION.industryKey).toBeNull();
  });
});

describe('getCampaignTypeOptions — no silent real-estate default', () => {
  it('returns RE adapter campaign types for property + real_estate', () => {
    const out = getCampaignTypeOptions('real_estate', 'property');
    // RE adapter ships values like "just_listed", "open_house", etc.
    const values = out.map((o) => o.value);
    expect(values).toContain('just_listed');
  });

  it('returns generic options for null industry + property source', () => {
    const out = getCampaignTypeOptions(null, 'property');
    // Should NOT contain real-estate-specific values.
    const values = out.map((o) => o.value);
    expect(values).not.toContain('just_listed');
    expect(values).not.toContain('open_house');
    expect(values).not.toContain('price_drop');
    // Should match the generic set.
    expect(out).toEqual(GENERIC_CAMPAIGN_TYPE_OPTIONS);
  });

  it('returns generic options for unknown industry + property source', () => {
    const out = getCampaignTypeOptions('not_an_industry', 'property');
    expect(out).toEqual(GENERIC_CAMPAIGN_TYPE_OPTIONS);
  });

  it('returns generic options for data_item / idea sources regardless of industry', () => {
    expect(getCampaignTypeOptions('real_estate', 'data_item')).toEqual(
      GENERIC_CAMPAIGN_TYPE_OPTIONS,
    );
    expect(getCampaignTypeOptions(null, 'idea')).toEqual(GENERIC_CAMPAIGN_TYPE_OPTIONS);
  });
});

describe('getDefaultChannels — no silent real-estate default', () => {
  it('reads adapter for known industry', () => {
    const channels = getDefaultChannels('just_listed', 'real_estate');
    // RE adapter declares default channels for just_listed.
    expect(Array.isArray(channels)).toBe(true);
  });

  it('falls through to generic table for null industry', () => {
    const channels = getDefaultChannels('promotion_offer', null);
    expect(Array.isArray(channels)).toBe(true);
  });

  it('returns [] for unknown campaign type + null industry (no real-estate guess)', () => {
    const channels = getDefaultChannels('totally_made_up_type', null);
    expect(channels).toEqual([]);
  });
});
