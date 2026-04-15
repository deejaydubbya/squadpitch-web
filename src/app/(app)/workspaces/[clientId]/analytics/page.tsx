'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Wand2, Calendar, Zap } from 'lucide-react';
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

      {/* Empty state — no data or no engagement data */}
      {data && !hasEngagementData && data.dataCoverage.totalPublished === 0 && (
        <div className="card p-8 text-center space-y-4">
          <BarChart3 className="w-10 h-10 text-white-20 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-white-100 mb-1">No data yet</h2>
            <p className="text-sm text-white-40 max-w-md mx-auto">
              Start creating and publishing content to see your performance metrics here.
              We'll track everything automatically.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 pt-2">
            <Link
              href={`/workspaces/${params.clientId}/create`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Generate your first post
            </Link>
            <div className="flex items-center gap-4 text-xs text-white-40 pt-1">
              <Link
                href={`/workspaces/${params.clientId}/planner`}
                className="flex items-center gap-1 hover:text-white-60 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                Schedule content
              </Link>
              <Link
                href={`/workspaces/${params.clientId}/business-data`}
                className="flex items-center gap-1 hover:text-white-60 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Run Autopilot
              </Link>
            </div>
          </div>
        </div>
      )}

      {data && (hasEngagementData || data.dataCoverage.totalPublished > 0) && (
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
