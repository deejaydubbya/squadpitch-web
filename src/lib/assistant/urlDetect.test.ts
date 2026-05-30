// URL-02 + URL-03 — shared URL detection + dashboard route builder.

import { describe, it, expect } from 'vitest';
import {
  looksLikeUrl,
  extractFirstUrl,
  buildCampaignRouteFromInput,
} from './urlDetect';

describe('looksLikeUrl', () => {
  it('matches https / http / www tokens', () => {
    expect(looksLikeUrl('https://example.com')).toBe(true);
    expect(looksLikeUrl('http://example.com/path')).toBe(true);
    expect(looksLikeUrl('www.example.com/listing')).toBe(true);
  });

  it('matches embedded URLs', () => {
    expect(looksLikeUrl('check this: https://example.com please')).toBe(true);
  });

  it('rejects plain text and empty input', () => {
    expect(looksLikeUrl('promote our open house')).toBe(false);
    expect(looksLikeUrl('')).toBe(false);
    expect(looksLikeUrl(null)).toBe(false);
    expect(looksLikeUrl(undefined)).toBe(false);
  });
});

describe('extractFirstUrl', () => {
  it('returns the first URL when multiple are present', () => {
    expect(
      extractFirstUrl('see https://a.com and https://b.com'),
    ).toBe('https://a.com');
  });

  it('prepends https:// for bare www. URLs', () => {
    expect(extractFirstUrl('www.example.com/listing')).toBe(
      'https://www.example.com/listing',
    );
  });

  it('drops trailing punctuation', () => {
    expect(extractFirstUrl('check https://example.com, please.')).toBe(
      'https://example.com',
    );
    expect(extractFirstUrl('(at https://example.com)')).toBe(
      'https://example.com',
    );
  });

  it('returns null for plain text', () => {
    expect(extractFirstUrl('promote our open house')).toBeNull();
  });
});

// URL-03 — dashboard route builder.
describe('buildCampaignRouteFromInput', () => {
  const BASE = '/workspaces/cm123';

  it('routes a pasted https URL to the URL-intake flow', () => {
    const out = buildCampaignRouteFromInput(
      BASE,
      'https://www.zillow.com/homedetails/abc',
    );
    expect(out).toBe(
      `${BASE}/create?intent=campaign&sourceType=url&sourceUrl=${encodeURIComponent(
        'https://www.zillow.com/homedetails/abc',
      )}`,
    );
  });

  it('routes a www. URL to the URL-intake flow (with https:// prepended)', () => {
    const out = buildCampaignRouteFromInput(BASE, 'www.example.com/listing');
    expect(out).toBe(
      `${BASE}/create?intent=campaign&sourceType=url&sourceUrl=${encodeURIComponent(
        'https://www.example.com/listing',
      )}`,
    );
  });

  it('routes plain text to the idea flow (unchanged behavior)', () => {
    const out = buildCampaignRouteFromInput(BASE, 'Promote our spring open house');
    expect(out).toBe(
      `${BASE}/create?intent=campaign&sourceType=idea&prompt=${encodeURIComponent(
        'Promote our spring open house',
      )}`,
    );
  });

  it('extracts the URL from a mixed paste ("look at https://… that page")', () => {
    const out = buildCampaignRouteFromInput(
      BASE,
      'look at https://example.com/listing/1 that page',
    );
    expect(out).toContain('sourceType=url');
    expect(out).toContain(encodeURIComponent('https://example.com/listing/1'));
  });

  it('returns null for empty or whitespace-only input', () => {
    expect(buildCampaignRouteFromInput(BASE, '')).toBeNull();
    expect(buildCampaignRouteFromInput(BASE, '   ')).toBeNull();
  });

  it('trims surrounding whitespace before routing', () => {
    const out = buildCampaignRouteFromInput(
      BASE,
      '   https://example.com/listing/1   ',
    );
    expect(out).toContain('sourceType=url');
    expect(out).toContain(encodeURIComponent('https://example.com/listing/1'));
  });
});
