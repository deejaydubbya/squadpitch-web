// Pure helpers extracted from AutopilotCommandCenter so they can
// be unit-tested without rendering React. The orchestrator imports
// pickHero + lastScanLabel from here.

import type { AutopilotCampaignRecommendation } from '@/hooks/useSquadpitch';

const STATUS_PRIORITY: Record<string, number> = {
  pending: 100,
  ready: 80,
  generating: 70,
  approved: 40,
  launched: 30,
};
const CONFIDENCE_PRIORITY: Record<string, number> = {
  high: 30,
  medium: 20,
  low: 10,
};

/**
 * Pick the highest-priority recommendation to feature as the
 * "next best move" hero card. Returns null if nothing actionable.
 *
 * Scoring: status weight + confidence weight + recency bonus (max
 * 10 points within last 7 days). Dismissed/expired never qualify.
 */
export function pickHero(
  recs: AutopilotCampaignRecommendation[],
): AutopilotCampaignRecommendation | null {
  if (recs.length === 0) return null;
  const candidates = recs.filter(
    (r) => r.status !== 'dismissed' && r.status !== 'expired',
  );
  if (candidates.length === 0) return null;
  const scored = candidates.map((rec) => ({
    rec,
    score:
      (STATUS_PRIORITY[rec.status] ?? 0) +
      (CONFIDENCE_PRIORITY[rec.confidence] ?? 0) +
      Math.min(
        10,
        Math.max(
          0,
          10 -
            Math.floor(
              (Date.now() - new Date(rec.triggeredAt).getTime()) /
                (24 * 60 * 60 * 1000),
            ),
        ),
      ),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored[0].rec;
}

/** Render an ISO timestamp as a compact "Xm ago" / "Xh ago" / "Xd ago". */
export function lastScanLabel(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'Just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
