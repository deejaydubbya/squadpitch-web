import { describe, it, expect } from 'vitest';
import { resolveThumbUrl } from './resolveThumb';
import type { MediaAsset } from '@/hooks/useSquadpitch';

// ── Helpers ──────────────────────────────────────────────────────────

function makeAsset(id: string, overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id,
    url: `https://cdn.example.com/${id}.jpg`,
    filename: `${id}.jpg`,
    assetType: 'image',
    status: 'READY',
    ...overrides,
  } as MediaAsset;
}

function makeMap(...assets: MediaAsset[]): Map<string, MediaAsset> {
  const map = new Map<string, MediaAsset>();
  for (const a of assets) map.set(a.id, a);
  return map;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('resolveThumbUrl', () => {
  describe('real asset IDs', () => {
    it('resolves an image asset from assetMap', () => {
      const asset = makeAsset('abc123');
      const result = resolveThumbUrl('abc123', makeMap(asset));
      expect(result.url).toBe('https://cdn.example.com/abc123.jpg');
      expect(result.isVideo).toBe(false);
      expect(result.label).toBe('abc123.jpg');
    });

    it('resolves a video asset — uses thumbnailUrl', () => {
      const asset = makeAsset('vid1', {
        assetType: 'video',
        url: 'https://cdn.example.com/vid1.mp4',
        thumbnailUrl: 'https://cdn.example.com/vid1-thumb.jpg',
      });
      const result = resolveThumbUrl('vid1', makeMap(asset));
      expect(result.url).toBe('https://cdn.example.com/vid1-thumb.jpg');
      expect(result.isVideo).toBe(true);
    });

    it('returns undefined url for unknown ID', () => {
      const result = resolveThumbUrl('nonexistent', new Map());
      expect(result.url).toBeUndefined();
      expect(result.isVideo).toBe(false);
      expect(result.label).toBe('nonexistent');
    });
  });

  describe('synthetic property_img_N IDs', () => {
    it('resolves from string array', () => {
      const images = ['https://photos.example.com/1.jpg', 'https://photos.example.com/2.jpg'];
      const result = resolveThumbUrl('property_img_0', new Map(), images);
      expect(result.url).toBe('https://photos.example.com/1.jpg');
      expect(result.isVideo).toBe(false);
      expect(result.label).toBe('Property photo 1');
    });

    it('resolves from object with .url', () => {
      const images = [{ url: 'https://photos.example.com/house.jpg', label: 'Front view' }];
      const result = resolveThumbUrl('property_img_0', new Map(), images);
      expect(result.url).toBe('https://photos.example.com/house.jpg');
      expect(result.label).toBe('Front view');
    });

    it('resolves from object with .src fallback', () => {
      const images = [{ src: 'https://photos.example.com/house.jpg' }];
      const result = resolveThumbUrl('property_img_0', new Map(), images);
      expect(result.url).toBe('https://photos.example.com/house.jpg');
    });

    it('resolves from object with .imageUrl fallback', () => {
      const images = [{ imageUrl: 'https://photos.example.com/house.jpg' }];
      const result = resolveThumbUrl('property_img_0', new Map(), images);
      expect(result.url).toBe('https://photos.example.com/house.jpg');
    });

    it('returns undefined for out-of-bounds index', () => {
      const images = ['https://photos.example.com/1.jpg'];
      const result = resolveThumbUrl('property_img_5', new Map(), images);
      expect(result.url).toBeUndefined();
      expect(result.label).toBe('Property photo 6');
    });

    it('returns undefined when propertyImages is undefined', () => {
      const result = resolveThumbUrl('property_img_0', new Map());
      expect(result.url).toBeUndefined();
    });
  });

  describe('synthetic item_img_N IDs', () => {
    it('resolves from itemImages array', () => {
      const items = ['https://items.example.com/photo1.jpg'];
      const result = resolveThumbUrl('item_img_0', new Map(), undefined, items);
      expect(result.url).toBe('https://items.example.com/photo1.jpg');
      expect(result.label).toBe('Data item photo 1');
    });

    it('returns undefined for missing item images', () => {
      const result = resolveThumbUrl('item_img_3', new Map(), undefined, []);
      expect(result.url).toBeUndefined();
    });
  });

  describe('priority: assetMap > synthetic', () => {
    it('prefers assetMap if ID exists there (even if it looks synthetic)', () => {
      // If somehow a real asset has the ID property_img_0, assetMap wins
      const asset = makeAsset('property_img_0', { url: 'https://cdn.example.com/real.jpg' });
      const propImages = ['https://photos.example.com/fallback.jpg'];
      const result = resolveThumbUrl('property_img_0', makeMap(asset), propImages);
      expect(result.url).toBe('https://cdn.example.com/real.jpg');
    });
  });
});
