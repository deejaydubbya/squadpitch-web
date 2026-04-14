'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAnalyticsOverview } from '@/hooks/useSquadpitch';
import type { AnalyticsRange } from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { RangeSelector } from '@/components/studio/analytics/RangeSelector';
import { AnalyticsHeroKpis } from '@/components/studio/analytics/AnalyticsHeroKpis';
import { KpiInsights } from '@/components/studio/analytics/KpiInsights';
import { TopPostsList } from '@/components/studio/analytics/TopPostsList';
import { PlatformBreakdownChart } from '@/components/studio/analytics/PlatformBreakdownChart';
import { PublishingTrendChart } from '@/components/studio/analytics/PublishingTrendChart';
import { DataCoverageNote } from '@/components/studio/analytics/DataCoverageNote';
import { SyncStatusIndicator } from '@/components/studio/analytics/SyncStatusIndicator';
import { InsightCards } from '@/components/studio/analytics/InsightCards';
import { RecommendationCards } from '@/components/studio/analytics/RecommendationCards';
import { ContentTypeBreakdownChart } from '@/components/studio/analytics/ContentTypeBreakdownChart';
import { PostDetailModal } from '@/components/studio/analytics/PostDetailModal';

export default function AnalyticsPage() {
  const params = useParams<{ clientId: string }>();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const { data, isLoading, error } = useAnalyticsOverview(params.clientId, range);

  const hasEngagementData =
    data != null && data.dataCoverage.withEngagementData > 0;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-white-100">Analytics</h1>
          {data && (
            <SyncStatusIndicator
              syncStatus={data.syncStatus}
              totalPublished={data.dataCoverage.totalPublished}
            />
          )}
        </div>
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-6">
          <LoadingSpinner size="sm" />
          <span className="text-white-40 text-sm">Loading analytics…</span>
        </div>
      )}

      {error && <StatusBanner error={(error as Error).message} />}

      {data && (
        <>
          <DataCoverageNote
            summary={data.summary}
            coverage={data.dataCoverage}
            syncStatus={data.syncStatus}
          />

          <AnalyticsHeroKpis
            summary={data.summary}
            hasEngagementData={hasEngagementData}
          />

          <KpiInsights kpis={data.kpis} />

          <InsightCards insights={data.insights ?? []} />

          <RecommendationCards recommendations={data.recommendations ?? []} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TopPostsList
              title="Top Posts"
              posts={data.topPosts}
              onPostClick={setSelectedPostId}
            />
            <TopPostsList
              title="Needs Attention"
              posts={data.worstPosts}
              onPostClick={setSelectedPostId}
            />
          </div>

          <PlatformBreakdownChart data={data.platformBreakdown} />

          <ContentTypeBreakdownChart data={data.contentTypeBreakdown ?? []} />

          <PublishingTrendChart data={data.publishingTrend} />
        </>
      )}

      {selectedPostId && (
        <PostDetailModal
          clientId={params.clientId}
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
        />
      )}
    </div>
  );
}
