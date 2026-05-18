// Spinstr424 — empty-state copy selector for OpportunityQueue.
//
// The tab count includes the hero; the queue list excludes it.
// When the only match is the hero, the empty-list copy must
// explicitly say so instead of "no opportunities yet".

import { describe, it, expect } from 'vitest';
import {
  pickQueueEmptyCopy,
  HERO_FEATURED_COPY,
  ZERO_MATCHES_COPY,
  type QueueFilter,
} from './opportunityQueue.helpers';

const FILTERS: QueueFilter[] = [
  'recommended',
  'drafts_ready',
  'approved',
  'scheduled',
  'dismissed',
  'all',
];

describe('pickQueueEmptyCopy', () => {
  it('returns the hero-featured copy when only the hero matches', () => {
    for (const filter of FILTERS) {
      expect(pickQueueEmptyCopy(filter, { onlyHeroMatches: true })).toBe(
        HERO_FEATURED_COPY[filter],
      );
    }
  });

  it('returns the zero-matches copy when nothing matches', () => {
    for (const filter of FILTERS) {
      expect(pickQueueEmptyCopy(filter, { onlyHeroMatches: false })).toBe(
        ZERO_MATCHES_COPY[filter],
      );
    }
  });

  it('per-filter hero copy mentions "featured above" and "queue"', () => {
    for (const filter of FILTERS) {
      const copy = HERO_FEATURED_COPY[filter];
      expect(copy).toContain('featured above');
      expect(copy).toContain('queue');
    }
  });

  it('hero copy for Recommended matches the spec verbatim', () => {
    expect(HERO_FEATURED_COPY.recommended).toBe(
      'Your recommended opportunity is featured above. No additional recommended opportunities are waiting in the queue.',
    );
  });

  it('hero copy for All uses the generic "top opportunity" phrasing', () => {
    expect(HERO_FEATURED_COPY.all).toBe(
      'Your top opportunity is featured above. No additional opportunities are waiting in the queue.',
    );
  });

  it('zero-matches copy does not mention the hero', () => {
    for (const filter of FILTERS) {
      expect(ZERO_MATCHES_COPY[filter]).not.toMatch(/featured above/i);
    }
  });
});
