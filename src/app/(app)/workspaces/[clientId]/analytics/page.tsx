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
import { AnalyticsSection } from '@/components/studio/analytics/AnalyticsSection';
import { MetricCard } from '@/components/studio/analytics/MetricCard';
import { CoverageMeter } from '@/components/studio/analytics/CoverageMeter';
import { TopPostsList } from '@/components/studio/analytics/TopPostsList';
import { PlatformBreakdownChart } from '@/components/studio/analytics/PlatformBreakdownChart';
import { PublishingTrendChart } from '@/components/studio/analytics/PublishingTrendChart';
import { SyncStatusIndicator } from '@/components/studio/analytics/SyncStatusIndicator';
import { InsightCards } from '@/components/studio/analytics/InsightCards';
import { RecommendationCards } from '@/components/studio/analytics/RecommendationCards';
import { ContentTypeBreakdownChart } from '@/components/studio/analytics/ContentTypeBreakdownChart';
import { PostDetailModal } from '@/components/studio/analytics/PostDetailModal';
import { ConversionsByTypeChart } from '@/components/studio/analytics/ConversionsByTypeChart';
import { ConversionsByChannelChart } from '@/components/studio/analytics/ConversionsByChannelChart';
import { TopConvertingPosts } from '@/components/studio/analytics/TopConvertingPosts';
import { CampaignTypeChart } from '@/components/studio/analytics/CampaignTypeChart';
import { CampaignDayChart } from '@/components/studio/analytics/CampaignDayChart';
import { TopCampaignsList } from '@/components/studio/analytics/TopCampaignsList';
import { AutopilotVsManualChart } from '@/components/studio/analytics/AutopilotVsManualChart';
import { AutopilotTriggerChart } from '@/components/studio/analytics/AutopilotTriggerChart';
import { AutopilotActivityList } from '@/components/studio/analytics/AutopilotActivityList';
import { DataTypePerformanceChart } from '@/components/studio/analytics/DataTypePerformanceChart';
import { BlueprintPerformanceChart } from '@/components/studio/analytics/BlueprintPerformanceChart';
import { TopDataItemsList, UnusedDataItemsList } from '@/components/studio/analytics/TopDataItemsList';
import { BenchmarkSummary } from '@/components/studio/analytics/BenchmarkSummary';

function formatNumber(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatPercent(n: number | null): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function capitalize(s: string | null): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function AnalyticsPage() {
  const params = useParams<{ clientId: string }>();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const { data, isLoading, error } = useAnalyticsOverview(params.clientId, range);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-white-100">Analytics</h1>
          {data && (
            <>
              <SyncStatusIndicator
                syncStatus={data.syncStatus}
                totalPublished={data.dataCoverage.totalPublished}
              />
              {data.timezone && data.timezone !== 'UTC' && (
                <p className="text-[10px] text-white-30">Times shown in {data.timezone.replace(/_/g, ' ')}</p>
              )}
            </>
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

      {/* Empty state — no posts */}
      {data && data.dataCoverage.totalPublished === 0 && (
        <div className="card p-8 text-center space-y-4">
          <BarChart3 className="w-10 h-10 text-white-20 mx-auto" />
          <div>
            <h2 className="text-lg font-semibold text-white-100 mb-1">No analytics yet</h2>
            <p className="text-sm text-white-40 max-w-md mx-auto">
              Publish your first post to start seeing performance metrics here.
              We&apos;ll track everything automatically.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 pt-2">
            <Link
              href={`/workspaces/${params.clientId}/create`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Create your first post
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

      {/* Sectioned layout */}
      {data && data.dataCoverage.totalPublished > 0 && (
        <>
          {/* Section 1: Distribution */}
          <AnalyticsSection
            title="Distribution"
            badge="Measured"
            isEmpty={!data.sections.distribution.hasReachData && data.sections.distribution.publishingTrend.length === 0}
            emptyMessage="No distribution data yet. Connect a platform to start tracking reach and impressions."
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricCard
                label="Impressions"
                value={formatNumber(data.sections.distribution.totalImpressions)}
                helper={data.sections.distribution.totalImpressions == null ? 'Connect platform' : 'Total views'}
                variant="blue"
              />
              <MetricCard
                label="Reach"
                value={formatNumber(data.sections.distribution.totalReach)}
                helper={data.sections.distribution.totalReach == null ? 'Connect platform' : 'People reached'}
                variant="blue"
              />
              <MetricCard
                label="Posts Published"
                value={data.sections.distribution.postsPublished.toString()}
                helper="In selected range"
                variant="blue"
              />
            </div>
            <PublishingTrendChart data={data.sections.distribution.publishingTrend} />
            {data.sections.distribution.hasReachData && (
              <PlatformBreakdownChart
                data={data.sections.distribution.platformReach}
                metric="totalReach"
                title="Reach by Platform"
              />
            )}
          </AnalyticsSection>

          {/* Section 2: Engagement */}
          <AnalyticsSection
            title="Engagement"
            badge={data.sections.engagement.hasEngagementData ? 'Measured' : 'AI Analysis'}
            isEmpty={data.sections.engagement.topPosts.length === 0}
            emptyMessage="No engagement data yet. Publish and sync posts to see performance rankings."
          >
            <div className="grid grid-cols-2 gap-3">
              {data.sections.engagement.hasEngagementData ? (
                <>
                  <MetricCard
                    label="Avg Engagement Rate"
                    value={formatPercent(data.sections.engagement.engagementRate)}
                    helper="Platform engagement"
                    variant="blue"
                  />
                  <MetricCard
                    label="Observed Performance"
                    value={data.sections.engagement.observedScore != null ? Math.round(data.sections.engagement.observedScore).toString() : '—'}
                    helper="Platform performance"
                    variant="blue"
                  />
                </>
              ) : (
                <>
                  <MetricCard
                    label="Quality Score"
                    value={data.sections.contentIntelligence.qualityScore != null ? Math.round(data.sections.contentIntelligence.qualityScore).toString() : '—'}
                    helper="AI estimate"
                    variant="purple"
                  />
                  <MetricCard
                    label="Composite Score"
                    value={data.sections.contentIntelligence.compositeScore != null ? Math.round(data.sections.contentIntelligence.compositeScore).toString() : '—'}
                    helper="AI estimate"
                    variant="purple"
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TopPostsList
                title="Top Posts"
                posts={data.sections.engagement.topPosts}
                onPostClick={setSelectedPostId}
              />
              <TopPostsList
                title="Needs Attention"
                posts={data.sections.engagement.worstPosts}
                onPostClick={setSelectedPostId}
              />
            </div>
            {data.sections.engagement.hasEngagementData && (
              <PlatformBreakdownChart
                data={data.platformBreakdown}
                metric="avgEngagementRate"
                title="Engagement by Platform"
              />
            )}
          </AnalyticsSection>

          {/* Section 3: Content Intelligence */}
          <AnalyticsSection
            title="Content Intelligence"
            badge="AI Analysis"
            isEmpty={
              (data.sections.contentIntelligence.insights?.length ?? 0) === 0 &&
              (data.sections.contentIntelligence.recommendations?.length ?? 0) === 0 &&
              (data.sections.contentIntelligence.contentTypeBreakdown?.length ?? 0) === 0
            }
            emptyMessage="Not enough data for content intelligence. Keep publishing to unlock AI-powered insights."
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Quality Score"
                value={data.sections.contentIntelligence.qualityScore != null ? Math.round(data.sections.contentIntelligence.qualityScore).toString() : '—'}
                helper="Content completeness"
                variant="purple"
              />
              <div className="card p-4 flex flex-col justify-center">
                <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Top Platform</p>
                <p className="text-sm font-semibold text-purple-400">
                  {capitalize(data.sections.contentIntelligence.topPlatform)}
                </p>
              </div>
              <div className="card p-4 flex flex-col justify-center">
                <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Best Content Type</p>
                <p className="text-sm font-semibold text-purple-400">
                  {capitalize(data.sections.contentIntelligence.bestContentType)}
                </p>
              </div>
              <div className="card p-4 flex flex-col justify-center">
                <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Best Media Type</p>
                <p className="text-sm font-semibold text-purple-400">
                  {capitalize(data.sections.contentIntelligence.bestMediaType)}
                </p>
              </div>
            </div>
            <InsightCards insights={data.sections.contentIntelligence.insights ?? []} />
            <ContentTypeBreakdownChart data={data.sections.contentIntelligence.contentTypeBreakdown ?? []} />
            <RecommendationCards recommendations={data.sections.contentIntelligence.recommendations ?? []} />
          </AnalyticsSection>

          {/* Section 4: Coverage & Trust */}
          <AnalyticsSection
            title="Coverage & Trust"
            badge="Measured"
            isEmpty={false}
            emptyMessage=""
          >
            <CoverageMeter {...data.sections.coverage} />
          </AnalyticsSection>

          {/* Section 5: Conversions */}
          <AnalyticsSection
            title="Conversions"
            badge="Measured"
            isEmpty={!data.sections.conversions?.hasData}
            emptyMessage="No conversions tracked yet. Create trackable links to start measuring business outcomes."
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Total Conversions"
                value={formatNumber(data.sections.conversions?.totalConversions ?? 0)}
                helper="All conversion events"
                variant="blue"
              />
              <MetricCard
                label="Conversion Rate"
                value={
                  data.sections.conversions?.conversionRate != null
                    ? `${data.sections.conversions.conversionRate.toFixed(2)}`
                    : '—'
                }
                helper="Per published post"
                variant="blue"
              />
              <MetricCard
                label="Active Links"
                value={(data.sections.conversions?.activeLinks ?? 0).toString()}
                helper="Trackable links"
              />
              <MetricCard
                label="Link Clicks"
                value={formatNumber(
                  data.sections.conversions?.byType?.find((t) => t.type === 'LINK_CLICK')?.count ?? 0,
                )}
                helper="Click-throughs"
                variant="blue"
              />
            </div>
            {(data.sections.conversions?.byType?.length ?? 0) > 0 && (
              <ConversionsByTypeChart data={data.sections.conversions!.byType} />
            )}
            {(data.sections.conversions?.byChannel?.length ?? 0) > 0 && (
              <ConversionsByChannelChart data={data.sections.conversions!.byChannel} />
            )}
            {(data.sections.conversions?.topDrafts?.length ?? 0) > 0 && (
              <TopConvertingPosts
                drafts={data.sections.conversions!.topDrafts}
                onPostClick={setSelectedPostId}
              />
            )}
          </AnalyticsSection>

          {/* Section 6: Campaigns */}
          <AnalyticsSection
            title="Campaigns"
            badge="Measured"
            isEmpty={!data.sections.campaigns?.hasData}
            emptyMessage="No campaign data yet. Create a listing campaign or content series to see campaign analytics."
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Total Campaigns"
                value={(data.sections.campaigns?.totalCampaigns ?? 0).toString()}
                helper="Distinct campaigns"
                variant="blue"
              />
              <MetricCard
                label="Completed"
                value={(data.sections.campaigns?.completedCampaigns ?? 0).toString()}
                helper={
                  data.sections.campaigns?.avgCompletionRate != null
                    ? `${Math.round(data.sections.campaigns.avgCompletionRate * 100)}% avg completion`
                    : 'Completion rate'
                }
                variant="blue"
              />
              <MetricCard
                label="Campaign Reach"
                value={formatNumber(data.sections.campaigns?.totalCampaignReach ?? null)}
                helper="Total people reached"
                variant="blue"
              />
              <MetricCard
                label="Avg Campaign Score"
                value={
                  data.sections.campaigns?.avgCampaignScore != null
                    ? Math.round(data.sections.campaigns.avgCampaignScore).toString()
                    : '—'
                }
                helper="Composite score"
                variant="blue"
              />
            </div>
            {(data.sections.campaigns?.byType?.length ?? 0) > 0 && (
              <CampaignTypeChart data={data.sections.campaigns!.byType} />
            )}
            {(data.sections.campaigns?.byDay?.length ?? 0) > 0 && (
              <CampaignDayChart data={data.sections.campaigns!.byDay} />
            )}
            {((data.sections.campaigns?.topCampaigns?.length ?? 0) > 0 ||
              (data.sections.campaigns?.worstCampaigns?.length ?? 0) > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TopCampaignsList
                  title="Top Campaigns"
                  campaigns={data.sections.campaigns?.topCampaigns ?? []}
                />
                <TopCampaignsList
                  title="Needs Attention"
                  campaigns={data.sections.campaigns?.worstCampaigns ?? []}
                />
              </div>
            )}
          </AnalyticsSection>

          {/* Section 7: Autopilot */}
          <AnalyticsSection
            title="Autopilot"
            badge="AI Analysis"
            isEmpty={!data.sections.autopilot?.hasData}
            emptyMessage="No autopilot data yet. Enable Autopilot to start generating content automatically."
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Generated"
                value={(data.sections.autopilot?.totalGenerated ?? 0).toString()}
                helper="Drafts created"
                variant="purple"
              />
              <MetricCard
                label="Published"
                value={(data.sections.autopilot?.totalPublished ?? 0).toString()}
                helper={
                  data.sections.autopilot?.publishRate != null
                    ? `${Math.round(data.sections.autopilot.publishRate * 100)}% publish rate`
                    : 'Publish rate'
                }
                variant="purple"
              />
              <MetricCard
                label="Approval Rate"
                value={
                  data.sections.autopilot?.approvalRate != null
                    ? `${Math.round(data.sections.autopilot.approvalRate * 100)}%`
                    : '—'
                }
                helper={`${data.sections.autopilot?.totalRejected ?? 0} rejected`}
                variant="purple"
              />
              <MetricCard
                label="Avg Score"
                value={
                  data.sections.autopilot?.avgAutopilotScore != null
                    ? Math.round(data.sections.autopilot.avgAutopilotScore).toString()
                    : '—'
                }
                helper={
                  data.sections.autopilot?.scoreDelta != null
                    ? `${data.sections.autopilot.scoreDelta > 0 ? '+' : ''}${data.sections.autopilot.scoreDelta} vs manual`
                    : 'Composite score'
                }
                variant="purple"
              />
            </div>
            <AutopilotVsManualChart
              avgAutopilotScore={data.sections.autopilot?.avgAutopilotScore ?? null}
              avgManualScore={data.sections.autopilot?.avgManualScore ?? null}
              avgAutopilotEngagement={data.sections.autopilot?.avgAutopilotEngagement ?? null}
              avgManualEngagement={data.sections.autopilot?.avgManualEngagement ?? null}
            />
            {(data.sections.autopilot?.byTrigger?.length ?? 0) > 0 && (
              <AutopilotTriggerChart data={data.sections.autopilot!.byTrigger} />
            )}
            {(data.sections.autopilot?.recentActivity?.length ?? 0) > 0 && (
              <AutopilotActivityList activity={data.sections.autopilot!.recentActivity} />
            )}
          </AnalyticsSection>

          {/* Section 8: Business Data */}
          <AnalyticsSection
            title="Business Data"
            badge="AI Analysis"
            isEmpty={!data.sections.businessData?.hasData}
            emptyMessage="No business data imported yet. Import data to see which sources create the best-performing content."
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard
                label="Data Items"
                value={(data.sections.businessData?.totalDataItems ?? 0).toString()}
                helper={`${data.sections.businessData?.totalUsed ?? 0} used`}
                variant="blue"
              />
              <MetricCard
                label="Unused"
                value={(data.sections.businessData?.totalUnused ?? 0).toString()}
                helper="Never used in content"
              />
              <MetricCard
                label="Drafts Generated"
                value={(data.sections.businessData?.totalDraftsFromData ?? 0).toString()}
                helper={`${data.sections.businessData?.totalPublishedFromData ?? 0} published`}
                variant="blue"
              />
              <MetricCard
                label="Stale"
                value={(data.sections.businessData?.totalStale ?? 0).toString()}
                helper="Not used in 30+ days"
              />
            </div>
            {(data.sections.businessData?.byType?.length ?? 0) > 0 && (
              <DataTypePerformanceChart data={data.sections.businessData!.byType} />
            )}
            {(data.sections.businessData?.byBlueprint?.length ?? 0) > 0 && (
              <BlueprintPerformanceChart data={data.sections.businessData!.byBlueprint} />
            )}
            {((data.sections.businessData?.topItems?.length ?? 0) > 0 ||
              (data.sections.businessData?.underusedItems?.length ?? 0) > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TopDataItemsList
                  title="Top Data Items"
                  items={data.sections.businessData?.topItems ?? []}
                />
                <UnusedDataItemsList
                  title="Underused Data"
                  items={data.sections.businessData?.underusedItems ?? []}
                />
              </div>
            )}
          </AnalyticsSection>

          {/* Section 9: Benchmarks */}
          <AnalyticsSection
            title="Benchmarks"
            badge="Measured"
            isEmpty={!data.sections.benchmarks?.hasData}
            emptyMessage="Not enough published posts to establish benchmarks. Keep publishing to build your performance baselines."
          >
            <BenchmarkSummary benchmarks={data.sections.benchmarks} />
          </AnalyticsSection>
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
