'use client';

import type { AnalyticsOverview, SyncStatus } from '@/hooks/useSquadpitch';

interface Props {
  summary: AnalyticsOverview['summary'];
  coverage: AnalyticsOverview['dataCoverage'];
  syncStatus?: SyncStatus;
}

export function DataCoverageNote({ summary, coverage, syncStatus }: Props) {
  if (summary.dataCoverage === 'full') return null;

  const hasSyncData = syncStatus && syncStatus.syncedPostCount > 0;

  return (
    <div className="rounded-xl border border-white-10 bg-white-5 px-4 py-3">
      <p className="text-xs text-white-60">
        {summary.dataCoverage === 'internal_only' ? (
          hasSyncData ? (
            <>
              Metrics sync is active but engagement data hasn&apos;t been collected
              for posts in this range yet. Scores are based on content quality signals.
            </>
          ) : (
            <>
              Analytics are based on content quality signals. Platform engagement
              data will appear automatically as posts are synced.
            </>
          )
        ) : (
          <>
            Engagement data available for {coverage.coveragePercent}% of posts.
            Remaining posts use content quality signals.
          </>
        )}
      </p>
    </div>
  );
}
