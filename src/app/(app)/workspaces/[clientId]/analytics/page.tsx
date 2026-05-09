'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Wand2,
  Calendar,
  Zap,
  LayoutDashboard,
  TrendingUp,
  Lightbulb,
  Shield,
  Settings,
} from 'lucide-react';
import { useAnalyticsOverview } from '@/hooks/useSquadpitch';
import type { AnalyticsRange, AnalyticsOverview } from '@/hooks/useSquadpitch';
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
import { MetaAppReviewBanner } from '@/components/studio/analytics/MetaAppReviewBanner';
import { ConnectedMetaAccountsCard } from '@/components/studio/analytics/ConnectedMetaAccountsCard';
import { MetaPlatformPerformanceCards } from '@/components/studio/analytics/MetaPlatformPerformanceCards';

// ── Helpers ─────────────────────────────────────────────────────────────────

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

function formatEngagementRate(n: number | null): string {
  if (n == null) return '—';
  const pct = n * 100;
  // Cap display at 100% with indicator for extreme values
  if (pct > 100) return `${pct.toFixed(1)}%`;
  return `${pct.toFixed(2)}%`;
}

function capitalize(s: string | null): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── Tab definitions ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'performance' | 'intelligence' | 'health';

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'performance', label: 'Performance', icon: TrendingUp },
  { key: 'intelligence', label: 'Intelligence', icon: Lightbulb },
  { key: 'health', label: 'System & Health', icon: Shield },
];

// ── Main page ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const params = useParams<{ clientId: string }>();
  const [range, setRange] = useState<AnalyticsRange>('30d');
  const [tab, setTab] = useState<Tab>('overview');
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

      {/* Meta App Review demo header (only renders when NEXT_PUBLIC_META_APP_REVIEW_DEMO=true) */}
      <MetaAppReviewBanner />
      <ConnectedMetaAccountsCard
        lastSyncedAt={data?.syncStatus?.lastSyncedAt ?? null}
      />
      {data && <MetaPlatformPerformanceCards platformBreakdown={data.platformBreakdown} />}

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

      {/* Tab navigation */}
      {data && data.dataCoverage.totalPublished > 0 && (
        <>
          <nav className="flex gap-1 border-b border-white-10 pb-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                    active
                      ? 'text-white-100 border-accent-green-110'
                      : 'text-white-40 border-transparent hover:text-white-60 hover:border-white-20'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </nav>

          {tab === 'overview' && (
            <OverviewTab data={data} clientId={params.clientId} onPostClick={setSelectedPostId} />
          )}
          {tab === 'performance' && (
            <PerformanceTab data={data} clientId={params.clientId} onPostClick={setSelectedPostId} />
          )}
          {tab === 'intelligence' && (
            <IntelligenceTab data={data} clientId={params.clientId} />
          )}
          {tab === 'health' && (
            <HealthTab data={data} clientId={params.clientId} />
          )}
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

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({
  data,
  clientId,
  onPostClick,
}: {
  data: AnalyticsOverview;
  clientId: string;
  onPostClick: (id: string) => void;
}) {
  const dist = data.sections.distribution;
  const eng = data.sections.engagement;
  const cov = data.sections.coverage;
  const intel = data.sections.contentIntelligence;

  // Determine the engagement rate warning
  const engRate = eng.engagementRate;
  const engRateIsExtreme = engRate != null && engRate > 0.5; // > 50%

  // Build "Focus This Week" cards
  const focusCards: { type: 'issue' | 'opportunity' | 'focus'; title: string; description: string }[] = [];

  if (cov.coveragePercent < 50) {
    focusCards.push({
      type: 'issue',
      title: 'Low data coverage',
      description: `Only ${cov.coveragePercent}% of posts have platform metrics. Connect channels to improve analytics accuracy.`,
    });
  }

  const topInsight = data.insights?.[0];
  if (topInsight) {
    focusCards.push({
      type: 'opportunity',
      title: topInsight.title,
      description: topInsight.description,
    });
  }

  const topRec = data.recommendations?.[0];
  if (topRec) {
    focusCards.push({
      type: 'focus',
      title: topRec.title,
      description: topRec.suggestedAction,
    });
  }

  const autopilot = data.sections.autopilot;
  if (autopilot?.hasData && autopilot.scoreDelta != null && autopilot.scoreDelta > 5) {
    focusCards.push({
      type: 'opportunity',
      title: 'Autopilot is outperforming',
      description: `Autopilot content scores ${autopilot.scoreDelta} points higher than manual posts.`,
    });
  }

  const FOCUS_COLORS = {
    issue: 'border-amber-500/20 bg-amber-500/5',
    opportunity: 'border-green-500/20 bg-green-500/5',
    focus: 'border-blue-500/20 bg-blue-500/5',
  } as const;
  const FOCUS_LABEL_COLORS = {
    issue: 'text-amber-400',
    opportunity: 'text-green-400',
    focus: 'text-blue-400',
  } as const;

  return (
    <div className="space-y-6">
      {/* Focus This Week */}
      {focusCards.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-white-40 uppercase tracking-wider">Focus This Week</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {focusCards.slice(0, 3).map((card) => (
              <div
                key={card.title}
                className={`rounded-lg border p-4 ${FOCUS_COLORS[card.type]}`}
              >
                <p className={`text-[10px] font-medium uppercase tracking-wider mb-1 ${FOCUS_LABEL_COLORS[card.type]}`}>
                  {card.type === 'issue' ? 'Issue' : card.type === 'opportunity' ? 'Opportunity' : 'Focus'}
                </p>
                <p className="text-sm font-medium text-white-100">{card.title}</p>
                <p className="text-xs text-white-60 mt-1 leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Posts Published"
          value={dist.postsPublished.toString()}
          helper="In selected range"
          variant="blue"
        />
        <MetricCard
          label="Total Reach"
          value={formatNumber(dist.totalReach)}
          helper={dist.totalReach == null ? 'Connect a platform to track' : 'Unique people reached'}
          variant="blue"
        />
        <MetricCard
          label="Total Impressions"
          value={formatNumber(dist.totalImpressions)}
          helper={dist.totalImpressions == null ? 'Connect a platform to track' : 'Total content views'}
          variant="blue"
        />
        <MetricCard
          label="Avg Engagement Rate"
          value={formatEngagementRate(engRate)}
          helper={
            eng.hasEngagementData
              ? engRateIsExtreme
                ? 'High rate — may include repeat engagements'
                : `Engagements / impressions across ${data.dataCoverage.withEngagementData} posts`
              : 'No engagement data synced'
          }
          tooltip={
            eng.hasEngagementData
              ? 'Engagement rate = total engagements / impressions. Rates above 100% can occur when engagements (likes, comments, shares, saves) exceed impressions — common with high-save or viral content.'
              : undefined
          }
          variant="blue"
          sampleSize={eng.hasEngagementData ? data.dataCoverage.withEngagementData : undefined}
        />
      </div>

      {/* Quick insights row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 flex flex-col justify-center">
          <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Top Platform</p>
          <p className="text-sm font-semibold text-blue-400">
            {capitalize(intel.topPlatform)}
          </p>
          <p className="text-[10px] text-white-30 mt-0.5">By avg composite score</p>
        </div>
        <div className="card p-4 flex flex-col justify-center">
          <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Top by Reach</p>
          <p className="text-sm font-semibold text-blue-400">
            {capitalize(
              [...data.platformBreakdown]
                .sort((a, b) => (b.totalReach ?? 0) - (a.totalReach ?? 0))[0]
                ?.channel ?? null,
            )}
          </p>
          <p className="text-[10px] text-white-30 mt-0.5">By total reach</p>
        </div>
        <div className="card p-4 flex flex-col justify-center">
          <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Best Content Type</p>
          <p className="text-sm font-semibold text-blue-400">
            {capitalize(intel.bestContentType)}
          </p>
          <p className="text-[10px] text-white-30 mt-0.5">By avg composite score</p>
        </div>
        <div className="card p-4 flex flex-col justify-center">
          <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Data Coverage</p>
          <p className="text-sm font-semibold text-white-100">
            {cov.coveragePercent}%
          </p>
          <p className="text-[10px] text-white-30 mt-0.5">
            {cov.withEngagementData}/{cov.totalPublished} posts with platform metrics
          </p>
        </div>
      </div>

      {/* Top & worst posts */}
      {eng.topPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TopPostsList
            title="Top Posts"
            posts={eng.topPosts}
            onPostClick={onPostClick}
          />
          <TopPostsList
            title="Needs Attention"
            posts={eng.worstPosts}
            onPostClick={onPostClick}
          />
        </div>
      )}

      {/* Publishing trend */}
      {dist.publishingTrend.length > 0 && (
        <PublishingTrendChart data={dist.publishingTrend} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════

function PerformanceTab({
  data,
  clientId,
  onPostClick,
}: {
  data: AnalyticsOverview;
  clientId: string;
  onPostClick: (id: string) => void;
}) {
  const dist = data.sections.distribution;
  const eng = data.sections.engagement;
  const campaigns = data.sections.campaigns;
  const conversions = data.sections.conversions;

  const engRate = eng.engagementRate;
  const engRateIsExtreme = engRate != null && engRate > 0.5;

  return (
    <div className="space-y-6">
      {/* ── Distribution ──────────────────────────────────────────────── */}
      <AnalyticsSection
        title="Distribution"
        badge="Measured"
        isEmpty={!dist.hasReachData && dist.publishingTrend.length === 0}
        emptyMessage="No distribution data yet. Connect a platform to start tracking reach and impressions."
        emptyAction={{ label: 'Connect a channel', href: `/workspaces/${clientId}/settings/channels` }}
        emptyHint="Distribution metrics show how far your content travels — impressions, reach, and posting frequency."
        emptyPreviewItems={['Impressions', 'Reach', 'Publishing trend']}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard
            label="Impressions"
            value={formatNumber(dist.totalImpressions)}
            helper={dist.totalImpressions == null ? 'Connect platform' : 'Total content views'}
            variant="blue"
            sampleSize={data.dataCoverage.withEngagementData}
          />
          <MetricCard
            label="Reach"
            value={formatNumber(dist.totalReach)}
            helper={dist.totalReach == null ? 'Connect platform' : 'Unique people reached'}
            variant="blue"
            sampleSize={data.dataCoverage.withEngagementData}
          />
          <MetricCard
            label="Posts Published"
            value={dist.postsPublished.toString()}
            helper="In selected range"
            variant="blue"
          />
        </div>
        <PublishingTrendChart data={dist.publishingTrend} />
        {dist.hasReachData && (
          <PlatformBreakdownChart
            data={dist.platformReach}
            metric="totalReach"
            title="Reach by Platform"
          />
        )}
      </AnalyticsSection>

      {/* ── Engagement ────────────────────────────────────────────────── */}
      <AnalyticsSection
        title="Engagement"
        badge={eng.hasEngagementData ? 'Measured' : 'AI Analysis'}
        isEmpty={eng.topPosts.length === 0}
        emptyMessage="No engagement data yet. Publish and sync posts to see performance rankings."
        emptyAction={{ label: 'Create content', href: `/workspaces/${clientId}/create` }}
        emptyHint="Engagement data tracks likes, comments, shares, and saves from your connected platforms."
        emptyPreviewItems={['Engagement rate', 'Top posts', 'Needs attention']}
      >
        <div className="grid grid-cols-2 gap-3">
          {eng.hasEngagementData ? (
            <>
              <MetricCard
                label="Avg Engagement Rate"
                value={formatEngagementRate(engRate)}
                helper={
                  engRateIsExtreme
                    ? 'High rate — may include repeat engagements'
                    : `Engagements / impressions across ${data.dataCoverage.withEngagementData} posts`
                }
                tooltip="Engagement rate = total engagements / impressions. Rates above 100% can occur when engagements (likes, comments, shares, saves) exceed impressions — common with high-save or viral content."
                variant="blue"
                sampleSize={data.dataCoverage.withEngagementData}
              />
              <MetricCard
                label="Observed Performance Score"
                value={eng.observedScore != null ? Math.round(eng.observedScore).toString() : '—'}
                helper="Derived from platform engagement data"
                tooltip="A composite score (0–100) derived from real engagement metrics like reach, likes, comments, shares, and saves. Higher is better."
                variant="blue"
              />
            </>
          ) : (
            <>
              <MetricCard
                label="Quality Score (Internal)"
                value={data.sections.contentIntelligence.qualityScore != null ? Math.round(data.sections.contentIntelligence.qualityScore).toString() : '—'}
                helper="AI content quality estimate"
                tooltip="An AI-generated score based on content completeness, structure, and best practices. Not based on real engagement data."
                variant="purple"
              />
              <MetricCard
                label="Composite Score (Internal)"
                value={data.sections.contentIntelligence.compositeScore != null ? Math.round(data.sections.contentIntelligence.compositeScore).toString() : '—'}
                helper="AI overall estimate"
                tooltip="Blends quality score with any available observed metrics. When no engagement data exists, this is primarily AI-driven."
                variant="purple"
              />
            </>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TopPostsList
            title="Top Posts"
            posts={eng.topPosts}
            onPostClick={onPostClick}
          />
          <TopPostsList
            title="Needs Attention"
            posts={eng.worstPosts}
            onPostClick={onPostClick}
          />
        </div>
        {eng.hasEngagementData && (
          <PlatformBreakdownChart
            data={data.platformBreakdown}
            metric="avgEngagementRate"
            title="Engagement Rate by Platform"
          />
        )}
      </AnalyticsSection>

      {/* ── Campaign Performance ──────────────────────────────────────── */}
      <AnalyticsSection
        title="Campaign Performance"
        badge={campaigns?.hasData ? 'Measured' : 'Measured'}
        isEmpty={!campaigns?.hasData}
        emptyMessage="No campaign data yet. Launch a listing campaign to see coordinated content performance."
        emptyAction={{ label: 'Launch a campaign', href: `/workspaces/${clientId}/create?mode=campaign` }}
        emptyHint="Campaign analytics track multi-post marketing efforts across platforms — reach, engagement, and completion rates."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Total Campaigns"
            value={(campaigns?.totalCampaigns ?? 0).toString()}
            helper="Distinct campaigns"
            variant="blue"
          />
          <MetricCard
            label="Completed"
            value={(campaigns?.completedCampaigns ?? 0).toString()}
            helper={
              campaigns?.avgCompletionRate != null
                ? `${Math.round(campaigns.avgCompletionRate * 100)}% avg completion`
                : 'Completion rate'
            }
            variant="blue"
          />
          <MetricCard
            label="Campaign Reach"
            value={formatNumber(campaigns?.totalCampaignReach ?? null)}
            helper="Total people reached via campaigns"
            variant="blue"
          />
          <MetricCard
            label="Avg Campaign Performance"
            value={
              campaigns?.avgCampaignScore != null
                ? Math.round(campaigns.avgCampaignScore).toString()
                : '—'
            }
            helper="Composite score (0–100)"
            tooltip="Average composite score across all campaign posts. Combines engagement metrics with content quality assessment."
            variant="blue"
          />
        </div>
        {(campaigns?.byType?.length ?? 0) > 0 && (
          <CampaignTypeChart data={campaigns!.byType} />
        )}
        {(campaigns?.byDay?.length ?? 0) > 0 && (
          <CampaignDayChart data={campaigns!.byDay} />
        )}
        {((campaigns?.topCampaigns?.length ?? 0) > 0 ||
          (campaigns?.worstCampaigns?.length ?? 0) > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TopCampaignsList
              title="Top Campaigns"
              campaigns={campaigns?.topCampaigns ?? []}
            />
            <TopCampaignsList
              title="Needs Attention"
              campaigns={campaigns?.worstCampaigns ?? []}
            />
          </div>
        )}
      </AnalyticsSection>

      {/* ── Conversions ───────────────────────────────────────────────── */}
      <AnalyticsSection
        title="Conversions"
        badge="Measured"
        isEmpty={!conversions?.hasData}
        emptyMessage="No conversions tracked yet."
        emptyAction={{ label: 'Create a trackable link', href: `/workspaces/${clientId}/links` }}
        emptyHint="Trackable links let you measure clicks, leads, and business outcomes from your published content."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Total Conversions"
            value={formatNumber(conversions?.totalConversions ?? 0)}
            helper="All conversion events"
            variant="blue"
          />
          <MetricCard
            label="Conversion Rate"
            value={
              conversions?.conversionRate != null
                ? `${conversions.conversionRate.toFixed(2)}%`
                : '—'
            }
            helper="Per published post"
            tooltip="Percentage of published posts that generated at least one conversion event."
            variant="blue"
          />
          <MetricCard
            label="Active Links"
            value={(conversions?.activeLinks ?? 0).toString()}
            helper="Trackable links"
          />
          <MetricCard
            label="Link Clicks"
            value={formatNumber(
              conversions?.byType?.find((t) => t.type === 'LINK_CLICK')?.count ?? 0,
            )}
            helper="Click-throughs"
            variant="blue"
          />
        </div>
        {(conversions?.byType?.length ?? 0) > 0 && (
          <ConversionsByTypeChart data={conversions!.byType} />
        )}
        {(conversions?.byChannel?.length ?? 0) > 0 && (
          <ConversionsByChannelChart data={conversions!.byChannel} />
        )}
        {(conversions?.topDrafts?.length ?? 0) > 0 && (
          <TopConvertingPosts
            drafts={conversions!.topDrafts}
            onPostClick={onPostClick}
          />
        )}
      </AnalyticsSection>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: CONTENT INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════

function IntelligenceTab({
  data,
  clientId,
}: {
  data: AnalyticsOverview;
  clientId: string;
}) {
  const intel = data.sections.contentIntelligence;
  const autopilot = data.sections.autopilot;
  const businessData = data.sections.businessData;

  return (
    <div className="space-y-6">
      {/* Notice: AI analysis */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-purple-500/5 border border-purple-500/15">
        <Lightbulb className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p className="text-xs text-purple-300/80">
          Content Intelligence uses AI analysis and pattern detection. Metrics labeled &quot;Internal&quot; are not
          from platform APIs — they&apos;re generated by our scoring engine. Use these for directional guidance, not as exact measurements.
        </p>
      </div>

      {/* ── Content Intelligence ──────────────────────────────────────── */}
      <AnalyticsSection
        title="Content Analysis"
        badge="AI Analysis"
        isEmpty={
          (intel.insights?.length ?? 0) === 0 &&
          (intel.recommendations?.length ?? 0) === 0 &&
          (intel.contentTypeBreakdown?.length ?? 0) === 0
        }
        emptyMessage="Not enough data for content intelligence. Keep publishing to unlock AI-powered insights."
        emptyAction={{ label: 'Create content', href: `/workspaces/${clientId}/create` }}
        emptyHint="Content Intelligence analyzes your posts for patterns in content type, hook style, media use, and sentiment."
        emptyPreviewItems={['Quality score', 'Insights', 'Recommendations', 'Content types']}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Quality Score (Internal)"
            value={intel.qualityScore != null ? Math.round(intel.qualityScore).toString() : '—'}
            helper="AI content assessment"
            tooltip="AI-generated score based on content structure, hooks, CTAs, hashtags, and media usage. Not derived from platform metrics."
            variant="purple"
          />
          <div className="card p-4 flex flex-col justify-center">
            <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Top Platform by Score</p>
            <p className="text-sm font-semibold text-purple-400">
              {capitalize(intel.topPlatform)}
            </p>
            <p className="text-[10px] text-white-30 mt-0.5">By avg composite score</p>
          </div>
          <div className="card p-4 flex flex-col justify-center">
            <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Best Content Type</p>
            <p className="text-sm font-semibold text-purple-400">
              {capitalize(intel.bestContentType)}
            </p>
            <p className="text-[10px] text-white-30 mt-0.5">By avg composite score</p>
          </div>
          <div className="card p-4 flex flex-col justify-center">
            <p className="text-xs text-white-40 uppercase tracking-wider mb-1.5">Best Media Type</p>
            <p className="text-sm font-semibold text-purple-400">
              {capitalize(intel.bestMediaType)}
            </p>
            <p className="text-[10px] text-white-30 mt-0.5">By avg performance</p>
          </div>
        </div>
        <InsightCards insights={intel.insights ?? []} />
        <ContentTypeBreakdownChart data={intel.contentTypeBreakdown ?? []} />
        <RecommendationCards recommendations={intel.recommendations ?? []} />
      </AnalyticsSection>

      {/* ── Autopilot ─────────────────────────────────────────────────── */}
      <AnalyticsSection
        title="Autopilot Performance"
        badge="AI Analysis"
        isEmpty={!autopilot?.hasData}
        emptyMessage="Enable Autopilot to start generating content automatically. Autopilot creates drafts based on your business data and posting gaps."
        emptyAction={{ label: 'Configure Autopilot', href: `/workspaces/${clientId}/settings` }}
        emptyHint="Once enabled, Autopilot will generate content from your listings, reviews, and milestones. You review and approve before anything publishes."
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Generated"
            value={(autopilot?.totalGenerated ?? 0).toString()}
            helper="Drafts created by Autopilot"
            variant="purple"
          />
          <MetricCard
            label="Published"
            value={(autopilot?.totalPublished ?? 0).toString()}
            helper={
              autopilot?.publishRate != null
                ? `${Math.round(autopilot.publishRate * 100)}% publish rate`
                : 'Publish rate'
            }
            variant="purple"
          />
          <MetricCard
            label="Approval Rate"
            value={
              autopilot?.approvalRate != null
                ? `${Math.round(autopilot.approvalRate * 100)}%`
                : '—'
            }
            helper={`${autopilot?.totalRejected ?? 0} rejected`}
            tooltip="Percentage of autopilot drafts that were approved (vs rejected). Higher approval rates indicate the AI is generating content that matches your brand voice."
            variant="purple"
          />
          <MetricCard
            label="Avg Autopilot Score"
            value={
              autopilot?.avgAutopilotScore != null
                ? Math.round(autopilot.avgAutopilotScore).toString()
                : '—'
            }
            helper={
              autopilot?.scoreDelta != null
                ? `${autopilot.scoreDelta > 0 ? '+' : ''}${autopilot.scoreDelta} vs manual`
                : 'Composite score'
            }
            tooltip="Average composite score for published autopilot content vs manually created content. Delta shows how autopilot content compares."
            variant="purple"
          />
        </div>
        {autopilot?.scoreDelta != null && (
          <div
            className={`flex items-start gap-2 px-4 py-3 rounded-lg border ${
              autopilot.scoreDelta >= 0
                ? 'bg-green-500/5 border-green-500/15'
                : 'bg-amber-500/5 border-amber-500/15'
            }`}
          >
            <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${autopilot.scoreDelta >= 0 ? 'text-green-400' : 'text-amber-400'}`} />
            <p className={`text-xs ${autopilot.scoreDelta >= 0 ? 'text-green-300/80' : 'text-amber-300/80'}`}>
              {autopilot.scoreDelta >= 0
                ? `Autopilot content is scoring ${autopilot.scoreDelta} points higher than manual posts.`
                : `Manual posts are outperforming Autopilot by ${Math.abs(autopilot.scoreDelta)} points.`}
              {autopilot.engagementDelta != null && (
                <> Engagement is {autopilot.engagementDelta >= 0 ? '+' : ''}{(autopilot.engagementDelta * 100).toFixed(1)}% for Autopilot.</>
              )}
            </p>
          </div>
        )}
        <AutopilotVsManualChart
          avgAutopilotScore={autopilot?.avgAutopilotScore ?? null}
          avgManualScore={autopilot?.avgManualScore ?? null}
          avgAutopilotEngagement={autopilot?.avgAutopilotEngagement ?? null}
          avgManualEngagement={autopilot?.avgManualEngagement ?? null}
        />
        {(autopilot?.byTrigger?.length ?? 0) > 0 && (
          <AutopilotTriggerChart data={autopilot!.byTrigger} />
        )}
        {(autopilot?.recentActivity?.length ?? 0) > 0 && (
          <AutopilotActivityList activity={autopilot!.recentActivity} />
        )}
      </AnalyticsSection>

      {/* ── Business Data Performance ─────────────────────────────────── */}
      <AnalyticsSection
        title="Business Data Performance"
        badge="AI Analysis"
        isEmpty={!businessData?.hasData}
        emptyMessage="No business data imported yet. Import listings, reviews, or milestones to see which sources create the best-performing content."
        emptyAction={{ label: 'Import business data', href: `/workspaces/${clientId}/business-data` }}
        emptyHint="Business data performance shows which imported items (listings, reviews, milestones) generate the best content."
        emptyPreviewItems={['Data items', 'Usage rate', 'Top performers', 'Freshness']}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Data Items"
            value={(businessData?.totalDataItems ?? 0).toString()}
            helper={`${businessData?.totalUsed ?? 0} used in content`}
            variant="purple"
          />
          <MetricCard
            label="Unused"
            value={(businessData?.totalUnused ?? 0).toString()}
            helper="Never used in content"
          />
          <MetricCard
            label="Drafts from Data"
            value={(businessData?.totalDraftsFromData ?? 0).toString()}
            helper={`${businessData?.totalPublishedFromData ?? 0} published`}
            variant="purple"
          />
          <MetricCard
            label="Stale"
            value={(businessData?.totalStale ?? 0).toString()}
            helper="Not used in 30+ days"
          />
        </div>
        {(businessData?.byType?.length ?? 0) > 0 && (
          <DataTypePerformanceChart data={businessData!.byType} />
        )}
        {(businessData?.byBlueprint?.length ?? 0) > 0 && (
          <BlueprintPerformanceChart data={businessData!.byBlueprint} />
        )}
        {((businessData?.topItems?.length ?? 0) > 0 ||
          (businessData?.underusedItems?.length ?? 0) > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TopDataItemsList
              title="Top Data Items"
              items={businessData?.topItems ?? []}
            />
            <UnusedDataItemsList
              title="Underused Data"
              items={businessData?.underusedItems ?? []}
            />
          </div>
        )}
      </AnalyticsSection>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: SYSTEM & HEALTH
// ═══════════════════════════════════════════════════════════════════════════

function HealthTab({
  data,
  clientId,
}: {
  data: AnalyticsOverview;
  clientId: string;
}) {
  const cov = data.sections.coverage;
  const benchmarks = data.sections.benchmarks;

  return (
    <div className="space-y-6">
      {/* ── Coverage & Trust ──────────────────────────────────────────── */}
      <AnalyticsSection
        title="Coverage & Trust"
        badge="Measured"
        isEmpty={false}
        emptyMessage=""
      >
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/15 mb-3">
          <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300/80">
            This section helps you understand how complete and trustworthy your analytics data is.
            Higher coverage means more insights are based on real platform metrics rather than AI estimates.
          </p>
        </div>
        <CoverageMeter {...cov} />
      </AnalyticsSection>

      {/* ── Benchmarks ────────────────────────────────────────────────── */}
      <AnalyticsSection
        title="Benchmarks"
        badge="Derived"
        isEmpty={!benchmarks?.hasData}
        emptyMessage="Not enough published posts to establish benchmarks. Keep publishing to build your performance baselines."
        emptyHint="Benchmarks are calculated from your own historical data — they compare your posts against your average. At least 10 published posts are recommended for meaningful benchmarks."
      >
        <BenchmarkSummary benchmarks={benchmarks} />
      </AnalyticsSection>

      {/* ── Setup status cards ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          Setup Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SetupCard
            title="Channel Connections"
            description="Connected social channels enable automatic metric syncing and direct publishing."
            status={
              (cov.connectionHealth?.length ?? 0) > 0
                ? `${cov.connectionHealth!.filter((c) => c.status === 'CONNECTED').length} connected`
                : 'No channels connected'
            }
            isSetUp={(cov.connectionHealth?.length ?? 0) > 0}
            href={`/workspaces/${clientId}/settings/channels`}
            actionLabel="Manage channels"
          />
          <SetupCard
            title="Autopilot"
            description="Automatically generates content from your business data, listings, and reviews."
            status={
              data.sections.autopilot?.hasData
                ? `${data.sections.autopilot.totalGenerated} drafts generated`
                : 'Not configured'
            }
            isSetUp={data.sections.autopilot?.hasData ?? false}
            href={`/workspaces/${clientId}/settings`}
            actionLabel="Configure"
          />
          <SetupCard
            title="Conversion Tracking"
            description="Track link clicks, leads, and business outcomes from your content."
            status={
              data.sections.conversions?.hasData
                ? `${data.sections.conversions.totalConversions} conversions`
                : 'No trackable links'
            }
            isSetUp={data.sections.conversions?.hasData ?? false}
            href={`/workspaces/${clientId}/links`}
            actionLabel="Create trackable link"
          />
          <SetupCard
            title="Business Data"
            description="Import listings, reviews, testimonials, and milestones to power data-driven content."
            status={
              data.sections.businessData?.hasData
                ? `${data.sections.businessData.totalDataItems} items imported`
                : 'No data imported'
            }
            isSetUp={data.sections.businessData?.hasData ?? false}
            href={`/workspaces/${clientId}/business-data`}
            actionLabel="Import data"
          />
        </div>
      </section>
    </div>
  );
}

// ── Setup card helper ─────────────────────────────────────────────────────

function SetupCard({
  title,
  description,
  status,
  isSetUp,
  href,
  actionLabel,
}: {
  title: string;
  description: string;
  status: string;
  isSetUp: boolean;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="card p-5 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white-100">{title}</h4>
        <span
          className={`w-2 h-2 rounded-full ${isSetUp ? 'bg-green-400' : 'bg-white-20'}`}
        />
      </div>
      <p className="text-xs text-white-40">{description}</p>
      <div className="flex items-center justify-between pt-1">
        <span className={`text-xs font-mono ${isSetUp ? 'text-green-400' : 'text-white-30'}`}>
          {status}
        </span>
        <Link
          href={href}
          className="text-xs text-white-40 hover:text-accent-green-110 transition-colors flex items-center gap-1"
        >
          <Settings className="w-3 h-3" />
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}
