import { describe, it, expect } from 'vitest';
import {
  extractBodyKeywords,
  assignImagesToPosts,
  type CampaignPostInfo,
  type ImagePoolEntry,
} from './mediaAssignment';

// ── extractBodyKeywords ─────────────────────────────────────────────

describe('extractBodyKeywords', () => {
  it('extracts kitchen keyword', () => {
    expect(extractBodyKeywords('Check out this stunning kitchen with granite countertops'))
      .toContain('kitchen');
  });

  it('extracts multiple keywords from real estate copy', () => {
    const body = 'The spacious living room flows into a gourmet kitchen with granite countertops and a cozy backyard patio.';
    const kws = extractBodyKeywords(body);
    expect(kws).toContain('kitchen');
    expect(kws).toContain('living');
    expect(kws).toContain('backyard');
    expect(kws).toContain('upgrade'); // granite
  });

  it('matches synonym patterns', () => {
    expect(extractBodyKeywords('The master suite is breathtaking')).toContain('bedroom');
    expect(extractBodyKeywords('Beautiful en-suite bathroom')).toContain('bathroom');
    expect(extractBodyKeywords('Great family room for entertaining')).toContain('living');
    expect(extractBodyKeywords('Breakfast nook off the main area')).toContain('dining');
    expect(extractBodyKeywords('Amazing curb appeal')).toContain('exterior');
    expect(extractBodyKeywords('Perfect home office setup')).toContain('office');
  });

  it('returns empty array when no keywords match', () => {
    expect(extractBodyKeywords('This is a great property!')).toEqual([]);
  });

  it('is case-insensitive', () => {
    expect(extractBodyKeywords('GORGEOUS KITCHEN with GRANITE')).toContain('kitchen');
    expect(extractBodyKeywords('GORGEOUS KITCHEN with GRANITE')).toContain('upgrade');
  });
});

// ── Body scoring ────────────────────────────────────────────────────

describe('body scoring', () => {
  const kitchenImage: ImagePoolEntry = {
    id: 'img-kitchen',
    label: 'kitchen',
    tags: ['kitchen', 'interior', 'granite'],
  };
  const bedroomImage: ImagePoolEntry = {
    id: 'img-bedroom',
    label: 'master bedroom',
    tags: ['bedroom', 'interior'],
  };

  it('boosts kitchen image for kitchen post body', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Post 1', body: 'This stunning kitchen with granite countertops will wow any chef' },
    ];
    const results = assignImagesToPosts(posts, [kitchenImage, bedroomImage]);

    expect(results).toHaveLength(1);
    expect(results[0].imageIds[0]).toBe('img-kitchen');
  });

  it('boosts bedroom image for bedroom post body', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Post 1', body: 'Retreat to the luxurious master suite after a long day' },
    ];
    const results = assignImagesToPosts(posts, [kitchenImage, bedroomImage]);

    expect(results).toHaveLength(1);
    expect(results[0].imageIds[0]).toBe('img-bedroom');
  });

  it('body: undefined is a no-op (backward compat)', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Post 1' },
    ];
    const pool: ImagePoolEntry[] = [
      { id: 'img-1', label: 'photo 1' },
    ];
    const results = assignImagesToPosts(posts, pool);

    expect(results).toHaveLength(1);
    expect(results[0].imageIds[0]).toBe('img-1');
  });
});

// ── Multi-image assignment ──────────────────────────────────────────

describe('multi-image assignment', () => {
  const pool: ImagePoolEntry[] = [
    { id: 'img-kitchen', label: 'kitchen', tags: ['kitchen', 'granite'] },
    { id: 'img-living', label: 'living room', tags: ['living', 'interior'] },
    { id: 'img-exterior', label: 'front exterior', tags: ['exterior', 'front'] },
    { id: 'img-bedroom', label: 'bedroom', tags: ['bedroom'] },
  ];

  it('returns multiple images when scores exceed threshold', () => {
    const posts: CampaignPostInfo[] = [
      {
        label: 'Dream Home Feature',
        body: 'Featuring a stunning kitchen with granite, spacious living room, and beautiful exterior curb appeal',
      },
    ];
    const results = assignImagesToPosts(posts, pool, {
      imagesPerPost: 3,
      maxImagesPerPost: 4,
      secondaryThreshold: 5,
    });

    expect(results).toHaveLength(1);
    expect(results[0].imageIds.length).toBeGreaterThan(1);
  });

  it('respects maxImagesPerPost cap', () => {
    const posts: CampaignPostInfo[] = [
      {
        label: 'Big Feature',
        body: 'kitchen living room exterior bedroom all in one post',
      },
    ];
    const results = assignImagesToPosts(posts, pool, {
      imagesPerPost: 2,
      maxImagesPerPost: 2,
      secondaryThreshold: 0,
    });

    expect(results).toHaveLength(1);
    expect(results[0].imageIds.length).toBeLessThanOrEqual(2);
  });

  it('returns fewer than target when scores are below threshold', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Generic Post', body: 'This is a great property!' },
    ];
    const lowScorePool: ImagePoolEntry[] = [
      { id: 'img-a', label: 'photo a' },
      { id: 'img-b', label: 'photo b' },
      { id: 'img-c', label: 'photo c' },
    ];
    const results = assignImagesToPosts(posts, lowScorePool, {
      imagesPerPost: 3,
      maxImagesPerPost: 3,
      secondaryThreshold: 50, // very high threshold
    });

    expect(results).toHaveLength(1);
    // Primary always assigned, but secondaries won't meet threshold
    expect(results[0].imageIds.length).toBe(1);
  });

  it('defaults to single image without options', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Post', body: 'kitchen living room exterior' },
    ];
    const results = assignImagesToPosts(posts, pool);

    expect(results).toHaveLength(1);
    expect(results[0].imageIds).toHaveLength(1);
  });
});

// ── Primary dedup ───────────────────────────────────────────────────

describe('primary dedup', () => {
  it('two posts do not share the same primary image', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Kitchen Feature', imageHint: 'kitchen' },
      { label: 'Kitchen Reminder', imageHint: 'kitchen' },
    ];
    const pool: ImagePoolEntry[] = [
      { id: 'img-kitchen', label: 'kitchen' },
      { id: 'img-living', label: 'living room' },
    ];
    const results = assignImagesToPosts(posts, pool);

    const primaries = results.map((r) => r.imageIds[0]);
    expect(new Set(primaries).size).toBe(2); // no duplicates
  });

  it('allows reuse when pool is smaller than posts', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Post A' },
      { label: 'Post B' },
      { label: 'Post C' },
    ];
    const pool: ImagePoolEntry[] = [
      { id: 'img-1', label: 'photo 1' },
    ];
    const results = assignImagesToPosts(posts, pool);

    expect(results).toHaveLength(3);
    // All must use the only available image
    for (const r of results) {
      expect(r.imageIds[0]).toBe('img-1');
    }
  });
});

// ── Round-robin fallback ────────────────────────────────────────────

describe('round-robin fallback', () => {
  it('assigns images to posts with zero score', () => {
    const posts: CampaignPostInfo[] = [
      { label: '' },
      { label: '' },
    ];
    const pool: ImagePoolEntry[] = [
      { id: 'img-1', label: 'a' },
      { id: 'img-2', label: 'b' },
    ];
    const results = assignImagesToPosts(posts, pool);

    expect(results).toHaveLength(2);
    const ids = results.map((r) => r.imageIds[0]).sort();
    expect(ids).toEqual(['img-1', 'img-2']);
  });
});

// ── Hero priority ───────────────────────────────────────────────────

describe('hero priority', () => {
  it('assigns hero image to first post', () => {
    const posts: CampaignPostInfo[] = [
      { label: 'Announcement' },
      { label: 'Feature' },
    ];
    const pool: ImagePoolEntry[] = [
      { id: 'img-regular', label: 'side view' },
      { id: 'img-hero', label: 'front view', isHero: true },
    ];
    const results = assignImagesToPosts(posts, pool);

    const firstPost = results.find((r) => r.postIndex === 0);
    expect(firstPost?.imageIds[0]).toBe('img-hero');
  });
});

// ── Empty inputs ────────────────────────────────────────────────────

describe('edge cases', () => {
  it('returns empty for no posts', () => {
    expect(assignImagesToPosts([], [{ id: '1', label: 'x' }])).toEqual([]);
  });

  it('returns empty for no images', () => {
    expect(assignImagesToPosts([{ label: 'x' }], [])).toEqual([]);
  });
});
