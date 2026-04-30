import { describe, it, expect } from 'vitest';
import { computePostStrength, selectBestVersion } from './normalizedPost.scoring';
import type { PostVersion } from './normalizedPost.types';

// ── selectBestVersion ───────────────────────────────────────────────

describe('selectBestVersion', () => {
  it('picks the highest scoring version', () => {
    const versions: PostVersion[] = [
      { id: 'a', label: 'A', body: '', hooks: [], hashtags: [], cta: null, score: { value: 5, max: 10, breakdown: [] } },
      { id: 'b', label: 'B', body: '', hooks: [], hashtags: [], cta: null, score: { value: 8, max: 10, breakdown: [] } },
      { id: 'c', label: 'C', body: '', hooks: [], hashtags: [], cta: null, score: { value: 6, max: 10, breakdown: [] } },
    ];
    expect(selectBestVersion(versions)).toBe('b');
  });

  it('first wins on ties', () => {
    const versions: PostVersion[] = [
      { id: 'a', label: 'A', body: '', hooks: [], hashtags: [], cta: null, score: { value: 7, max: 10, breakdown: [] } },
      { id: 'b', label: 'B', body: '', hooks: [], hashtags: [], cta: null, score: { value: 7, max: 10, breakdown: [] } },
    ];
    expect(selectBestVersion(versions)).toBe('a');
  });

  it('handles null scores (treats as -1)', () => {
    const versions: PostVersion[] = [
      { id: 'a', label: 'A', body: '', hooks: [], hashtags: [], cta: null, score: null },
      { id: 'b', label: 'B', body: '', hooks: [], hashtags: [], cta: null, score: { value: 3, max: 10, breakdown: [] } },
    ];
    expect(selectBestVersion(versions)).toBe('b');
  });

  it('returns first version id when all scores are null', () => {
    const versions: PostVersion[] = [
      { id: 'a', label: 'A', body: '', hooks: [], hashtags: [], cta: null, score: null },
      { id: 'b', label: 'B', body: '', hooks: [], hashtags: [], cta: null, score: null },
    ];
    expect(selectBestVersion(versions)).toBe('a');
  });

  it('returns empty string for empty array', () => {
    expect(selectBestVersion([])).toBe('');
  });
});

// ── computePostStrength (legacy 4-dim mode) ─────────────────────────

describe('computePostStrength - legacy mode (no channel)', () => {
  it('produces grade field on every breakdown item', () => {
    const result = computePostStrength({
      body: 'Some post content here that is reasonably long enough to get some points for body length',
      cta: 'Call now',
      hashtags: ['a', 'b', 'c'],
      hooks: ['Hook 1'],
      scoredHooks: null,
    });

    expect(result.breakdown.length).toBeGreaterThan(0);
    for (const item of result.breakdown) {
      expect(['strong', 'decent', 'weak', 'missing']).toContain(item.grade);
    }
  });

  it('gives max score for strong post', () => {
    const result = computePostStrength({
      body: 'A'.repeat(150),
      cta: 'Buy now',
      hashtags: ['a', 'b', 'c', 'd'],
      hooks: ['Hook 1', 'Hook 2', 'Hook 3'],
      scoredHooks: null,
    });

    expect(result.value).toBe(10);
    expect(result.max).toBe(10);
  });

  it('gives 0 for empty post', () => {
    const result = computePostStrength({
      body: '',
      cta: null,
      hashtags: [],
      hooks: [],
      scoredHooks: null,
    });

    expect(result.value).toBe(0);
  });

  it('scores hooks via scoredHooks when available', () => {
    const result = computePostStrength({
      body: 'A'.repeat(150),
      cta: 'CTA',
      hashtags: ['a', 'b', 'c'],
      hooks: [],
      scoredHooks: [{ text: 'Great hook', hookScore: 9, reason: 'Strong' }],
    });

    const hookItem = result.breakdown[0];
    expect(hookItem.points).toBe(3);
    expect(hookItem.grade).toBe('strong');
  });
});

// ── computePostStrength (7-dim weighted mode) ───────────────────────

describe('computePostStrength - weighted mode (with channel)', () => {
  it('produces 7 breakdown items', () => {
    const result = computePostStrength({
      body: 'Great property in Austin with amazing views and modern finishes',
      cta: 'Contact us',
      hashtags: ['realestate', 'austin', 'luxury', 'homes', 'dreamhome'],
      hooks: ['Hot listing!', 'Must see!', 'Just listed!'],
      scoredHooks: null,
      channel: 'INSTAGRAM',
      mediaRefs: [{ id: '1', source: 'user_selected' }],
      locationContext: 'austin',
    });

    expect(result.breakdown).toHaveLength(7);
    expect(result.max).toBe(10);
  });

  it('each dimension contributes to total', () => {
    const result = computePostStrength({
      body: 'A'.repeat(200),
      cta: 'Buy now',
      hashtags: ['a', 'b', 'c', 'd', 'e', 'f'],
      hooks: ['Hook 1', 'Hook 2', 'Hook 3'],
      scoredHooks: null,
      channel: 'INSTAGRAM',
      mediaRefs: [{ id: '1', source: 'user_selected' }],
      locationContext: undefined,
    });

    expect(result.value).toBeGreaterThan(0);
    // Sum of all breakdown points should approximate value
    const sum = result.breakdown.reduce((acc, item) => acc + item.points, 0);
    expect(Math.round(sum)).toBe(result.value);
  });

  it('neutral scoring when channel is unknown', () => {
    const result = computePostStrength({
      body: 'A'.repeat(200),
      cta: 'CTA',
      hashtags: ['a', 'b', 'c'],
      hooks: ['Hook'],
      scoredHooks: null,
      channel: 'PINTEREST' as 'INSTAGRAM', // unknown channel
    });

    // platformFit is the 6th dimension (index 5)
    const platItem = result.breakdown[5];
    expect(platItem).toBeDefined();
  });

  it('neutral scoring when media refs not provided', () => {
    const result = computePostStrength({
      body: 'A'.repeat(200),
      cta: 'CTA',
      hashtags: ['a', 'b', 'c'],
      hooks: ['Hook'],
      scoredHooks: null,
      channel: 'INSTAGRAM',
      // no mediaRefs
    });

    // mediaStrength is the 7th dimension (index 6)
    const mediaItem = result.breakdown[6];
    expect(mediaItem).toBeDefined();
    // Neutral = 0.7 * 1.0 = 0.7
    expect(mediaItem!.points).toBeCloseTo(0.7, 1);
  });

  it('localRelevance: body with location scores higher', () => {
    const withLocation = computePostStrength({
      body: 'Beautiful home in Austin with great views of downtown',
      cta: 'Call', hashtags: ['a', 'b', 'c'], hooks: ['Hook'],
      scoredHooks: null, channel: 'INSTAGRAM',
      locationContext: 'austin',
    });
    const withoutRef = computePostStrength({
      body: 'Beautiful home with great views of downtown area',
      cta: 'Call', hashtags: ['a', 'b', 'c'], hooks: ['Hook'],
      scoredHooks: null, channel: 'INSTAGRAM',
      locationContext: 'austin',
    });

    // localRelevance is the 5th dimension (index 4)
    const localWith = withLocation.breakdown[4];
    const localWithout = withoutRef.breakdown[4];
    expect(localWith!.points).toBeGreaterThan(localWithout!.points);
  });

  it('localRelevance: no location context gives neutral score', () => {
    const result = computePostStrength({
      body: 'Some post content',
      cta: 'CTA', hashtags: ['a'], hooks: ['Hook'],
      scoredHooks: null, channel: 'INSTAGRAM',
      locationContext: undefined,
    });

    // localRelevance is the 5th dimension (index 4)
    const localItem = result.breakdown[4];
    expect(localItem).toBeDefined();
    // Neutral = 0.7 * 1.5 = 1.05
    expect(localItem!.points).toBeCloseTo(1.05, 1);
  });

  it('platformFit: Instagram-length post with right hashtag count scores well', () => {
    const result = computePostStrength({
      body: 'A'.repeat(500), // within 100-2200
      cta: 'CTA',
      hashtags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], // 7, within 5-15
      hooks: ['Hook'],
      scoredHooks: null,
      channel: 'INSTAGRAM',
    });

    // platformFit is the 6th dimension (index 5)
    const platItem = result.breakdown[5];
    expect(platItem).toBeDefined();
    expect(platItem!.points).toBe(1.5); // Perfect fit
    expect(platItem!.grade).toBe('strong');
  });

  it('platformFit: tweet over 280 chars scores poorly', () => {
    const result = computePostStrength({
      body: 'A'.repeat(400), // over 280
      cta: null,
      hashtags: ['a', 'b'],
      hooks: ['Hook'],
      scoredHooks: null,
      channel: 'X',
    });

    // platformFit is the 6th dimension (index 5)
    const platItem = result.breakdown[5];
    expect(platItem).toBeDefined();
    expect(platItem!.points).toBeLessThan(1.5);
  });

  it('mediaStrength: real media scores 1.0', () => {
    const result = computePostStrength({
      body: 'Content',
      cta: null, hashtags: [], hooks: [],
      scoredHooks: null, channel: 'INSTAGRAM',
      mediaRefs: [{ id: '1', source: 'user_selected' }],
    });

    // mediaStrength is the 7th dimension (index 6)
    const mediaItem = result.breakdown[6];
    expect(mediaItem!.points).toBe(1);
  });

  it('mediaStrength: no media scores 0.3', () => {
    const result = computePostStrength({
      body: 'Content',
      cta: null, hashtags: [], hooks: [],
      scoredHooks: null, channel: 'INSTAGRAM',
      mediaRefs: [],
    });

    // mediaStrength is the 7th dimension (index 6)
    const mediaItem = result.breakdown[6];
    expect(mediaItem!.points).toBeCloseTo(0.3, 1);
  });

  it('mediaStrength: ai_generated media scores 0.7', () => {
    const result = computePostStrength({
      body: 'Content',
      cta: null, hashtags: [], hooks: [],
      scoredHooks: null, channel: 'INSTAGRAM',
      mediaRefs: [{ id: '1', source: 'ai_generated' }],
    });

    // mediaStrength is the 7th dimension (index 6)
    const mediaItem = result.breakdown[6];
    expect(mediaItem!.points).toBeCloseTo(0.7, 1);
  });
});
