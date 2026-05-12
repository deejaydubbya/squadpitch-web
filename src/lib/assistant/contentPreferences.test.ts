import { describe, it, expect } from 'vitest';
import {
  packDefaultCampaignTypes,
  unpackDefaultCampaignTypes,
  getDefaultCampaignTypeForSource,
} from './contentPreferences';

describe('packDefaultCampaignTypes', () => {
  it('returns null for an empty map', () => {
    expect(packDefaultCampaignTypes({})).toBeNull();
  });

  it('encodes a single source', () => {
    expect(packDefaultCampaignTypes({ property: 'just_listed' })).toBe(
      'property:just_listed',
    );
  });

  it('encodes all three sources joined by |', () => {
    const packed = packDefaultCampaignTypes({
      property: 'just_listed',
      data_item: 'educational',
      idea: 'lead_generation',
    });
    // The order is iteration order over VALID_SOURCE_KEYS — stable
    // regardless of how the caller's map was constructed.
    expect(packed).toBe(
      'property:just_listed|data_item:educational|idea:lead_generation',
    );
  });

  it('drops empty / whitespace values', () => {
    expect(
      packDefaultCampaignTypes({ property: '   ', data_item: 'awareness' }),
    ).toBe('data_item:awareness');
  });

  it('strips delimiter chars from values defensively', () => {
    expect(
      packDefaultCampaignTypes({ property: 'just|listed:weird' }),
    ).toBe('property:justlistedweird');
  });

  it('drops values that become empty after stripping', () => {
    expect(packDefaultCampaignTypes({ property: '|||' })).toBeNull();
  });
});

describe('unpackDefaultCampaignTypes', () => {
  it('returns an empty map for null', () => {
    expect(unpackDefaultCampaignTypes(null)).toEqual({});
  });

  it('returns an empty map for undefined', () => {
    expect(unpackDefaultCampaignTypes(undefined)).toEqual({});
  });

  it('returns an empty map for an empty string', () => {
    expect(unpackDefaultCampaignTypes('')).toEqual({});
  });

  it('decodes a fully populated string', () => {
    expect(
      unpackDefaultCampaignTypes(
        'property:just_listed|data_item:educational|idea:lead_generation',
      ),
    ).toEqual({
      property: 'just_listed',
      data_item: 'educational',
      idea: 'lead_generation',
    });
  });

  it('ignores unknown source keys', () => {
    expect(unpackDefaultCampaignTypes('property:x|garbage:y|idea:z')).toEqual({
      property: 'x',
      idea: 'z',
    });
  });

  it('ignores malformed entries', () => {
    expect(
      unpackDefaultCampaignTypes('property:|:orphan|no_colon|idea:lg'),
    ).toEqual({ idea: 'lg' });
  });

  it('survives round-trip for every source', () => {
    const input = {
      property: 'open_house',
      data_item: 'social_proof',
      idea: 'awareness',
    };
    expect(unpackDefaultCampaignTypes(packDefaultCampaignTypes(input))).toEqual(
      input,
    );
  });
});

describe('getDefaultCampaignTypeForSource', () => {
  it('returns the value for a known source', () => {
    expect(
      getDefaultCampaignTypeForSource(
        'property:just_listed|idea:lead_generation',
        'idea',
      ),
    ).toBe('lead_generation');
  });

  it('returns null when no default is set for that source', () => {
    expect(
      getDefaultCampaignTypeForSource('property:just_listed', 'idea'),
    ).toBeNull();
  });

  it('returns null when packed is null', () => {
    expect(getDefaultCampaignTypeForSource(null, 'property')).toBeNull();
  });
});
