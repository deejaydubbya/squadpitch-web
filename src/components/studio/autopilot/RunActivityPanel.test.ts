// Spinstr04 — runDetailFragments builder.
//
// Pins the plain-English fragments the activity panel appends to
// each run row. Counts singular vs plural correctly; only emits
// fragments when the underlying counter is > 0.

import { describe, it, expect } from 'vitest';
import type { AutopilotRun } from '@/hooks/useSquadpitch';
import { runDetailFragments } from './runActivity.helpers';

function run(metadata: AutopilotRun['metadata']): AutopilotRun {
  return {
    id: 'r1',
    triggerSource: 'scheduled',
    status: 'created_recommendations',
    reason: null,
    recommendationsCreated: 1,
    recommendationsUpdated: 0,
    recommendationsExpired: 0,
    startedAt: '2026-05-18T12:00:00Z',
    finishedAt: '2026-05-18T12:00:05Z',
    errorMessage: null,
    metadata,
  };
}

describe('runDetailFragments', () => {
  it('returns an empty array when metadata is null', () => {
    expect(runDetailFragments(run(null))).toEqual([]);
  });

  it('returns an empty array when summary counts are zero', () => {
    expect(
      runDetailFragments(
        run({
          summary: {
            eligibleListings: 3,
            duplicatesSuppressed: 0,
            listingsCappedByRunLimit: 0,
          },
        }),
      ),
    ).toEqual([]);
  });

  it('emits singular "duplicate" for count of 1', () => {
    const out = runDetailFragments(
      run({ summary: { duplicatesSuppressed: 1 } }),
    );
    expect(out).toEqual(['collapsed 1 duplicate']);
  });

  it('emits plural "duplicates" for count > 1', () => {
    const out = runDetailFragments(
      run({ summary: { duplicatesSuppressed: 2 } }),
    );
    expect(out).toEqual(['collapsed 2 duplicates']);
  });

  it('emits cap fragment alongside duplicates', () => {
    const out = runDetailFragments(
      run({
        summary: {
          duplicatesSuppressed: 2,
          listingsCappedByRunLimit: 4,
        },
      }),
    );
    expect(out).toEqual([
      'collapsed 2 duplicates',
      '4 more held for next run',
    ]);
  });

  it('surfaces auto-generate counts (singular vs plural)', () => {
    expect(
      runDetailFragments(run({ autoGenerate: { draftsCreated: 1 } })),
    ).toEqual(['auto-prepared 1 draft']);
    expect(
      runDetailFragments(run({ autoGenerate: { draftsCreated: 3 } })),
    ).toEqual(['auto-prepared 3 drafts']);
  });

  it('surfaces auto-generate skipped count', () => {
    const out = runDetailFragments(
      run({
        autoGenerate: {
          draftsCreated: 1,
          skipped: [
            { recommendationId: 'r1', reason: 'no source' },
            { recommendationId: 'r2', reason: 'generic copy' },
          ],
        },
      }),
    );
    expect(out).toEqual([
      'auto-prepared 1 draft',
      '2 held back from auto-generation',
    ]);
  });

  it('combines summary + autoGenerate in order', () => {
    const out = runDetailFragments(
      run({
        summary: { duplicatesSuppressed: 1, listingsCappedByRunLimit: 2 },
        autoGenerate: { draftsCreated: 1 },
      }),
    );
    expect(out).toEqual([
      'collapsed 1 duplicate',
      '2 more held for next run',
      'auto-prepared 1 draft',
    ]);
  });
});
