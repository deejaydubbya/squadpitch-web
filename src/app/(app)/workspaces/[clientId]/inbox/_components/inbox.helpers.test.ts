// Pure-logic tests for inbox.helpers. Covers the externalIds parser
// added in spinstr412 (social-identity row in the Lead Details drawer)
// — guarantees that malformed enrichmentJson shapes can't render
// junk + that valid shapes round-trip correctly.

import { describe, it, expect } from 'vitest';
import { readExternalIds } from './inbox.helpers';

describe('readExternalIds', () => {
  it('returns [] for a null or non-object enrichment', () => {
    expect(readExternalIds(null)).toEqual([]);
    expect(readExternalIds({} as Record<string, unknown>)).toEqual([]);
  });

  it('returns [] when externalIds is missing', () => {
    expect(readExternalIds({ alternateEmails: ['a@b.com'] })).toEqual([]);
    expect(readExternalIds({ externalIds: null })).toEqual([]);
  });

  it('returns [] when externalIds is the wrong shape', () => {
    // Arrays and primitives are not allowed at the externalIds slot.
    expect(readExternalIds({ externalIds: ['FACEBOOK'] })).toEqual([]);
    expect(readExternalIds({ externalIds: 'FACEBOOK' })).toEqual([]);
    expect(readExternalIds({ externalIds: 12345 })).toEqual([]);
  });

  it('maps a single-provider externalIds map to a flat array', () => {
    const out = readExternalIds({
      externalIds: { FACEBOOK: 'fbid_123' },
    });
    expect(out).toEqual([{ provider: 'FACEBOOK', id: 'fbid_123' }]);
  });

  it('preserves provider order and supports multiple providers', () => {
    const out = readExternalIds({
      externalIds: {
        FACEBOOK: 'fbid_123',
        INSTAGRAM: 'igid_456',
        YOUTUBE: 'ytid_789',
      },
    });
    expect(out).toEqual([
      { provider: 'FACEBOOK', id: 'fbid_123' },
      { provider: 'INSTAGRAM', id: 'igid_456' },
      { provider: 'YOUTUBE', id: 'ytid_789' },
    ]);
  });

  it('drops keys whose value is empty / non-string', () => {
    const out = readExternalIds({
      externalIds: {
        FACEBOOK: 'fbid_123',
        INSTAGRAM: '',          // empty string
        YOUTUBE: null,          // null
        LINKEDIN: 999,          // non-string
        THREADS: { id: 'x' },   // nested object
        X: 'xid_42',
      },
    });
    expect(out).toEqual([
      { provider: 'FACEBOOK', id: 'fbid_123' },
      { provider: 'X', id: 'xid_42' },
    ]);
  });

  it('tolerates additional enrichment keys without touching them', () => {
    const out = readExternalIds({
      submissions: [{ at: '2026-05-15', data: {} }],
      alternateEmails: ['alt@example.com'],
      externalIds: { FACEBOOK: 'fb_1' },
      firstSeenProvider: 'FACEBOOK',
    });
    expect(out).toEqual([{ provider: 'FACEBOOK', id: 'fb_1' }]);
  });
});
