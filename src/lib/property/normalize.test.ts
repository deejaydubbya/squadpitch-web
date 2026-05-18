// Sites-02 — property normalizer.
//
// Pins:
//   - Reads dataJson safely (string + number price; beds/baths/sqft
//     in either bedrooms/bathrooms or beds/baths form).
//   - Photo precedence: _photos[isPrimary] > imageUrl > images[0].
//   - Composed address line + title fallbacks behave.
//   - Key-detail item + hero-subheadline + safe-description
//     helpers never invent facts.

import { describe, it, expect } from 'vitest';
import type { WorkspaceDataItem } from '@/hooks/useSquadpitch';
import {
  normalizeProperty,
  buildKeyDetailItems,
  buildHeroSubheadline,
  buildSafeDescription,
} from './normalize';

function item(partial: Partial<WorkspaceDataItem> & { dataJson?: Record<string, unknown> }): WorkspaceDataItem {
  return {
    id: partial.id ?? 'item-1',
    clientId: 'c1',
    type: 'PROPERTY',
    title: partial.title ?? null,
    summary: null,
    dataJson: partial.dataJson ?? {},
    tags: [],
    priority: 0,
    status: 'ACTIVE',
    usageCount: 0,
    expiresAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    dataSourceId: null,
    performance: null,
    lastUsedAt: null,
  } as unknown as WorkspaceDataItem;
}

describe('normalizeProperty', () => {
  it('returns null when item is missing', () => {
    expect(normalizeProperty(null)).toBeNull();
    expect(normalizeProperty(undefined)).toBeNull();
  });

  it('extracts core address + price fields', () => {
    const out = normalizeProperty(
      item({
        title: '508 King George Court',
        dataJson: {
          street: '508 King George Court',
          city: 'Springboro',
          state: 'OH',
          zip: '45066',
          price: 425000,
          bedrooms: 4,
          bathrooms: 3,
          sqft: 2840,
          propertyType: 'single_family',
          yearBuilt: 2008,
          status: 'active',
        },
      }),
    );
    expect(out?.title).toBe('508 King George Court');
    expect(out?.addressLine).toBe('508 King George Court, Springboro, OH, 45066');
    expect(out?.price).toBe(425000);
    expect(out?.priceFormatted).toBe('$425,000');
    expect(out?.beds).toBe(4);
    expect(out?.baths).toBe(3);
    expect(out?.sqft).toBe(2840);
    expect(out?.propertyType).toBe('single_family');
    expect(out?.yearBuilt).toBe(2008);
    expect(out?.status).toBe('active');
  });

  it('falls through legacy bed/bath/sqft aliases', () => {
    const out = normalizeProperty(
      item({
        dataJson: {
          street: '1 Main St',
          beds: 2,
          baths: 1,
          squareFeet: 900,
        },
      }),
    );
    expect(out?.beds).toBe(2);
    expect(out?.baths).toBe(1);
    expect(out?.sqft).toBe(900);
  });

  it('parses price strings ("$425,000")', () => {
    const out = normalizeProperty(item({ dataJson: { price: '$425,000' } }));
    expect(out?.price).toBe(425000);
    expect(out?.priceFormatted).toBe('$425,000');
  });

  it('photo precedence: _photos isPrimary > imageUrl > images[0]', () => {
    const out = normalizeProperty(
      item({
        dataJson: {
          imageUrl: 'https://a/hero.jpg',
          images: ['https://a/secondary.jpg'],
          _photos: [
            { url: 'https://a/hero.jpg', source: 'upload' },
            { url: 'https://a/winner.jpg', source: 'upload', isPrimary: true },
          ],
        },
      }),
    );
    expect(out?.primaryImage).toBe('https://a/winner.jpg');
    expect(out?.images[0]).toBe('https://a/winner.jpg');
  });

  it('falls back to imageUrl when no _photos isPrimary exists', () => {
    const out = normalizeProperty(
      item({ dataJson: { imageUrl: 'https://a/hero.jpg', images: ['https://a/other.jpg'] } }),
    );
    expect(out?.primaryImage).toBe('https://a/hero.jpg');
  });

  it('falls back to images[0] when only images[] exists', () => {
    const out = normalizeProperty(item({ dataJson: { images: ['https://a/1.jpg', 'https://a/2.jpg'] } }));
    expect(out?.primaryImage).toBe('https://a/1.jpg');
    expect(out?.images).toEqual(['https://a/1.jpg', 'https://a/2.jpg']);
  });

  it('returns null primaryImage when no photo data', () => {
    const out = normalizeProperty(item({ dataJson: { street: '1 Main St' } }));
    expect(out?.primaryImage).toBeNull();
    expect(out?.images).toEqual([]);
  });

  it('uses composed address as title when item.title is missing or placeholder', () => {
    expect(
      normalizeProperty(
        item({ title: 'Untitled Listing', dataJson: { street: '1 Main St', city: 'Cincinnati' } }),
      )?.title,
    ).toBe('1 Main St, Cincinnati');
    expect(
      normalizeProperty(item({ title: undefined, dataJson: { street: '1 Main St' } }))?.title,
    ).toBe('1 Main St');
  });

  it('falls back to "Untitled property" when no title or address available', () => {
    expect(normalizeProperty(item({ title: undefined, dataJson: {} }))?.title).toBe('Untitled property');
  });

  it('reads externalListingId from common aliases', () => {
    expect(
      normalizeProperty(item({ dataJson: { externalListingId: 'EXT-1' } }))?.externalListingId,
    ).toBe('EXT-1');
    expect(normalizeProperty(item({ dataJson: { mlsId: 'MLS-42' } }))?.externalListingId).toBe('MLS-42');
    expect(normalizeProperty(item({ dataJson: { sourceId: 'SRC-9' } }))?.externalListingId).toBe('SRC-9');
  });
});

describe('buildKeyDetailItems', () => {
  it('returns only rows with data', () => {
    const prop = normalizeProperty(
      item({
        dataJson: {
          street: '1 Main St',
          price: 425000,
          bedrooms: 4,
          // no baths, no sqft
          propertyType: 'single_family',
        },
      }),
    )!;
    const rows = buildKeyDetailItems(prop);
    expect(rows).toEqual([
      { label: 'Price', value: '$425,000' },
      { label: 'Beds', value: '4' },
      { label: 'Type', value: 'single_family' },
    ]);
  });
});

describe('buildHeroSubheadline', () => {
  it('combines bed/bath, sqft, price, type', () => {
    const prop = normalizeProperty(
      item({
        dataJson: { street: '1 Main St', price: 425000, bedrooms: 4, bathrooms: 3, sqft: 2840, propertyType: 'single_family' },
      }),
    )!;
    expect(buildHeroSubheadline(prop)).toBe('4 bed / 3 bath · 2,840 sq ft · $425,000 · single_family');
  });

  it('returns empty string when nothing useful is present', () => {
    const prop = normalizeProperty(item({ dataJson: { street: '1 Main St' } }))!;
    expect(buildHeroSubheadline(prop)).toBe('');
  });
});

describe('buildSafeDescription', () => {
  it('prefers the existing description when present', () => {
    const prop = normalizeProperty(
      item({ dataJson: { street: '1 Main St', description: 'Custom narrative.' } }),
    )!;
    expect(buildSafeDescription(prop)).toBe('Custom narrative.');
  });

  it('builds a factual sentence from known fields', () => {
    const prop = normalizeProperty(
      item({
        title: '508 King George Court',
        dataJson: { bedrooms: 4, bathrooms: 3, sqft: 2840, yearBuilt: 2008, propertyType: 'single_family', price: 425000 },
      }),
    )!;
    const out = buildSafeDescription(prop);
    expect(out).toContain('4 bedrooms');
    expect(out).toContain('3 bathrooms');
    expect(out).toContain('2,840 square feet');
    expect(out).toContain('Built in 2008');
    expect(out).toContain('$425,000');
  });

  it('returns empty when no description and no useful fields', () => {
    const prop = normalizeProperty(item({ title: 'X', dataJson: {} }))!;
    expect(buildSafeDescription(prop)).toBe('');
  });
});
