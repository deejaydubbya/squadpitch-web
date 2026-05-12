// Roll a campaign's per-draft statuses up into a single lifecycle
// label for the planner / dashboard. Same logic as the Planner's
// CampaignSection header chip — extracted here so other surfaces
// (Dashboard sidebar, focus view, search results) can reuse it.

import type { Draft, DraftStatus } from '@/hooks/useSquadpitch';

export type CampaignLifecycle =
  | 'needs_review'
  | 'drafts'
  | 'partially_scheduled'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'mixed';

export const CAMPAIGN_LIFECYCLE_LABELS: Record<CampaignLifecycle, string> = {
  needs_review: 'Needs Review',
  drafts: 'Drafts',
  partially_scheduled: 'Partially Scheduled',
  scheduled: 'Scheduled',
  publishing: 'Publishing',
  published: 'Published',
  failed: 'Failed',
  mixed: 'In Progress',
};

export const CAMPAIGN_LIFECYCLE_STYLES: Record<CampaignLifecycle, string> = {
  needs_review: 'bg-amber-500/15 text-amber-300',
  drafts: 'bg-white-10 text-white-60',
  partially_scheduled: 'bg-blue-500/15 text-blue-300',
  scheduled: 'bg-blue-500/15 text-blue-300',
  publishing: 'bg-accent-green-110/15 text-accent-green-110',
  published: 'bg-accent-green-110/15 text-accent-green-110',
  failed: 'bg-red-500/15 text-red-300',
  mixed: 'bg-white-10 text-white-60',
};

export function computeCampaignLifecycle(drafts: Draft[]): CampaignLifecycle {
  if (drafts.length === 0) return 'drafts';
  const counts: Partial<Record<DraftStatus, number>> = {};
  for (const d of drafts) {
    counts[d.status] = (counts[d.status] ?? 0) + 1;
  }
  const total = drafts.length;
  const has = (s: DraftStatus) => (counts[s] ?? 0) > 0;
  if ((counts.FAILED ?? 0) === total) return 'failed';
  if ((counts.PUBLISHED ?? 0) === total) return 'published';
  if ((counts.PUBLISHED ?? 0) > 0 && (counts.SCHEDULED ?? 0) > 0) return 'publishing';
  if ((counts.SCHEDULED ?? 0) === total) return 'scheduled';
  if (has('SCHEDULED') && (has('DRAFT') || has('PENDING_REVIEW') || has('APPROVED'))) {
    return 'partially_scheduled';
  }
  if ((counts.PENDING_REVIEW ?? 0) > 0) return 'needs_review';
  if ((counts.DRAFT ?? 0) === total || (counts.APPROVED ?? 0) === total) return 'drafts';
  if ((counts.DRAFT ?? 0) + (counts.APPROVED ?? 0) === total) return 'drafts';
  return 'mixed';
}

/**
 * Pick the next upcoming scheduled date in a campaign (drafts with
 * `scheduledFor` in the future). Falls back to the earliest
 * `scheduledFor` if all dates are in the past.
 */
export function nextScheduledDate(drafts: Draft[]): string | null {
  const now = Date.now();
  let nextFuture: string | null = null;
  let earliest: string | null = null;
  for (const d of drafts) {
    if (!d.scheduledFor) continue;
    if (!earliest || d.scheduledFor < earliest) earliest = d.scheduledFor;
    const t = Date.parse(d.scheduledFor);
    if (!Number.isFinite(t) || t < now) continue;
    if (!nextFuture || d.scheduledFor < nextFuture) nextFuture = d.scheduledFor;
  }
  return nextFuture ?? earliest;
}
