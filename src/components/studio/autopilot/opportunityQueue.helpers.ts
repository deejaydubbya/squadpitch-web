// Pure helpers for OpportunityQueue, kept in their own .ts
// module so unit tests can import them without hitting the
// parent .tsx file's JSX.

export type QueueFilter =
  | 'recommended'
  | 'drafts_ready'
  | 'approved'
  | 'scheduled'
  | 'dismissed'
  | 'all';

// Spinstr424 — empty-state copy depends on *why* the queue is
// empty:
//   - onlyHeroMatches=true → the matching rec is featured above
//     in the Next Best Move card. Say so explicitly so the tab
//     count ("Recommended 1") doesn't contradict the queue copy.
//   - otherwise → nothing matches the filter at all.
export function pickQueueEmptyCopy(
  filter: QueueFilter,
  opts: { onlyHeroMatches: boolean },
): string {
  if (opts.onlyHeroMatches) return HERO_FEATURED_COPY[filter];
  return ZERO_MATCHES_COPY[filter];
}

export const HERO_FEATURED_COPY: Record<QueueFilter, string> = {
  recommended:
    'Your recommended opportunity is featured above. No additional recommended opportunities are waiting in the queue.',
  drafts_ready:
    'Your drafts-ready opportunity is featured above. No additional drafts-ready opportunities are waiting in the queue.',
  approved:
    'Your approved opportunity is featured above. No additional approved opportunities are waiting in the queue.',
  scheduled:
    'Your scheduled opportunity is featured above. No additional scheduled opportunities are waiting in the queue.',
  dismissed:
    'Your dismissed opportunity is featured above. No additional dismissed opportunities are waiting in the queue.',
  all: 'Your top opportunity is featured above. No additional opportunities are waiting in the queue.',
};

export const ZERO_MATCHES_COPY: Record<QueueFilter, string> = {
  recommended: 'No opportunities yet. Autopilot will surface them as it detects activity.',
  drafts_ready: 'No drafts ready for approval.',
  approved: 'No approved recommendations yet.',
  scheduled: 'No scheduled campaigns yet.',
  dismissed: 'No dismissed recommendations.',
  all: 'Nothing to show.',
};
