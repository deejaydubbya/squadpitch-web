'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { OnboardingWelcome } from '@/components/studio/OnboardingWelcome';
import {
  Sparkles,
  Send,
  LinkIcon,
  ChevronRight,
  Zap,
  Target,
  BarChart3,
  Eye,
  AlertCircle,
} from 'lucide-react';
import {
  useClient,
  useDrafts,
  useClientAnalytics,
  useChannelSettings,
  useChannelConnectionStatus,
  useDashboardRecommendations,
  useDuplicateDraft,
  useAcceptRecommendation,
  useDismissRecommendation,
  useIntegrationStatus,
  useListingSources,
  type DashboardRecommendation,
  type DashboardRecommendationsResponse,
} from '@/hooks/useSquadpitch';
import { useGenericIntegrations } from '@/hooks/useIntegrations';
import { groupDraftsByCampaign } from '@/components/studio/campaignGrouping';
import { SetupProgress } from '@/components/studio/SetupProgress';
import { ListingOpportunitiesWidget } from '@/components/studio/NearbyListingsWidget';
import { GBPDashboardWidget } from '@/components/studio/GBPDashboardWidget';
import { SystemStatusCard } from '@/components/studio/SystemStatusCard';
import { AutopilotStatusCard } from '@/components/studio/AutopilotStatusCard';
import { AutopilotCampaignsSection } from '@/components/studio/AutopilotCampaignsSection';
import { OpportunitiesSection } from '@/components/studio/OpportunitiesSection';
import { ContentActivitySection } from '@/components/studio/ContentActivitySection';
import type { NextActionItem } from '@/components/studio/OpportunitiesSection';

export default function OverviewPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(searchParams.get('onboarded') === 'true');

  const { data: client } = useClient(clientId);
  const { data: drafts, isLoading: draftsLoading } = useDrafts({
    clientId,
    limit: 5,
  });
  const { data: allDrafts } = useDrafts({ clientId, limit: 100 });
  const { data: analytics } = useClientAnalytics(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const connectionStatus = useChannelConnectionStatus(clientId);
  const { data: recommendations } = useDashboardRecommendations(clientId);
  const { data: integrationStatus } = useIntegrationStatus(clientId);
  const { data: listingData } = useListingSources(clientId);
  const { data: genericIntegrations } = useGenericIntegrations();
  const duplicate = useDuplicateDraft();
  const acceptRec = useAcceptRecommendation(clientId);
  const dismissRec = useDismissRecommendation(clientId);

  if (!client) return null;
  const base = `/workspaces/${clientId}`;

  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];
  const connectedCount = connectionStatus.size;
  const disconnectedCount = enabledChannels.filter((c) => !connectionStatus.get(c.channel)).length;
  const summary = recommendations?.summary;
  const isRE = client.industryKey === 'real_estate';

  // ── Derived data for dashboard sections ────────────────────────────────

  // Upcoming scheduled posts (next 5, sorted by date)
  const upcomingPosts = useMemo(() => {
    if (!allDrafts) return [];
    return allDrafts
      .filter((d) => d.status === 'SCHEDULED' && d.scheduledFor)
      .sort((a, b) => (a.scheduledFor! > b.scheduledFor! ? 1 : -1))
      .slice(0, 5);
  }, [allDrafts]);

  // Active campaigns
  const { campaignGroups: activeCampaigns } = useMemo(() => {
    if (!allDrafts) return { campaignGroups: [], standaloneDrafts: [] };
    const active = allDrafts.filter((d) => d.campaignId && d.status !== 'PUBLISHED');
    return groupDraftsByCampaign(active);
  }, [allDrafts]);

  // Needs-attention counters
  const attentionItems = useMemo(() => {
    const items: { label: string; count: number; href: string; accent: string }[] = [];
    const pending = analytics?.byStatus?.PENDING_REVIEW ?? 0;
    if (pending > 0) {
      items.push({ label: 'Pending review', count: pending, href: `${base}/planner`, accent: 'text-yellow-400' });
    }
    const approvedUnscheduled = allDrafts?.filter((d) => d.status === 'APPROVED' && !d.scheduledFor).length ?? 0;
    if (approvedUnscheduled > 0) {
      items.push({ label: 'Approved, not scheduled', count: approvedUnscheduled, href: `${base}/planner`, accent: 'text-green-400' });
    }
    const failed = analytics?.byStatus?.FAILED ?? 0;
    if (failed > 0) {
      items.push({ label: 'Failed to publish', count: failed, href: `${base}/planner`, accent: 'text-red-400' });
    }
    if (disconnectedCount > 0) {
      items.push({ label: 'Channel(s) not connected', count: disconnectedCount, href: `${base}/settings/channels`, accent: 'text-orange-400' });
    }
    return items;
  }, [analytics, allDrafts, base, disconnectedCount]);

  // Top recommendation (1 high-confidence rec, not duplicating Next Actions)
  const topRecommendation = useMemo(() => {
    if (!recommendations?.recommendations) return null;
    const high = recommendations.recommendations.find((r) => r.confidence === 'high');
    return high ?? recommendations.recommendations[0] ?? null;
  }, [recommendations]);

  // ── Compute Next Actions from real state ──────────────────────────────
  const nextActions = useMemo(() => {
    const items: NextActionItem[] = [];

    const approved = analytics?.byStatus?.APPROVED ?? 0;
    if (approved > 0) {
      items.push({
        id: 'publish-approved',
        icon: <Send className="w-5 h-5" />,
        title: `Publish ${approved} approved post${approved > 1 ? 's' : ''}`,
        description: 'Approved posts ready to go live',
        href: `${base}/planner`,
        cta: 'Publish',
        priority: 1,
        accent: 'text-accent-green-110 bg-accent-green-110/15',
        reasons: ['You have approved posts ready to publish'],
      });
    }

    const pending = analytics?.byStatus?.PENDING_REVIEW ?? 0;
    if (pending > 0) {
      items.push({
        id: 'review-pending',
        icon: <Eye className="w-5 h-5" />,
        title: `Review ${pending} pending draft${pending > 1 ? 's' : ''}`,
        description: 'Drafts waiting for your approval',
        href: `${base}/planner`,
        cta: 'Review',
        priority: 2,
        accent: 'text-yellow-400 bg-yellow-400/15',
        reasons: ['Drafts are waiting for your review before they can be published'],
      });
    }

    const unused = summary?.unusedDataCount ?? 0;
    if (unused > 0) {
      items.push({
        id: 'create-from-data',
        icon: <Sparkles className="w-5 h-5" />,
        title: `Create posts from ${unused} unused source${unused > 1 ? 's' : ''}`,
        description: 'Source material ready to turn into posts',
        href: `${base}/create`,
        cta: 'Create',
        priority: 3,
        accent: 'text-purple-400 bg-purple-400/15',
        reasons: ['You have unused source material that can be turned into content'],
      });
    }

    const published = summary?.publishedThisWeek ?? 0;
    if (published < 5 && items.length < 4) {
      items.push({
        id: 'hit-target',
        icon: <Target className="w-5 h-5" />,
        title: published === 0
          ? "You haven't posted this week yet"
          : `You're at ${published}/5 posts this week`,
        description: published === 0
          ? 'Start publishing to build momentum'
          : 'Schedule more to hit your weekly target',
        href: `${base}/planner`,
        cta: 'Schedule',
        priority: 4,
        accent: 'text-orange-400 bg-orange-400/15',
        reasons: [published === 0 ? 'No posts published this week yet' : `Only ${published} of 5 weekly target posts published`],
      });
    }

    const isAPEnabled = summary?.autopilot?.enabled ?? false;
    const hasData = (summary?.totalDataItems ?? 0) > 0;
    if (!isAPEnabled && hasData && items.length < 4) {
      items.push({
        id: 'enable-autopilot',
        icon: <Zap className="w-5 h-5" />,
        title: 'Turn on Autopilot',
        description: 'Let Squadpitch create and schedule posts automatically',
        action: 'toggle_autopilot',
        cta: 'Enable',
        priority: 5,
        accent: 'text-yellow-400 bg-yellow-400/15',
        reasons: ['You have data sources but Autopilot is not enabled'],
      });
    }

    if (connectedCount === 0 && items.length < 4) {
      items.push({
        id: 'setup-channels',
        icon: <LinkIcon className="w-5 h-5" />,
        title: 'Connect a publishing channel',
        description: 'Link Instagram, TikTok, or LinkedIn to start publishing',
        href: `${base}/settings/channels`,
        cta: 'Connect',
        priority: 6,
        accent: 'text-blue-400 bg-blue-400/15',
        reasons: ['No publishing channels connected yet'],
      });
    }

    // Fill remaining slots from API recommendations
    if (items.length < 2 && recommendations?.recommendations) {
      for (const rec of recommendations.recommendations) {
        if (items.length >= 4) break;
        if (items.some((i) => i.id === rec.id)) continue;
        const hint = rec.sourceLabel
          ? `Based on your ${rec.sourceLabel.toLowerCase()}`
          : rec.sourceType
            ? `Based on your ${rec.sourceType.replace(/_/g, ' ')}`
            : undefined;
        items.push({
          id: rec.id,
          icon: <Sparkles className="w-5 h-5" />,
          title: rec.title,
          description: rec.description,
          action: rec.action,
          cta: rec.actionLabel,
          priority: 10 + rec.priority,
          accent: 'text-accent-green-110 bg-accent-green-110/15',
          sourceHint: hint,
          reasons: rec.reasons,
          dismissable: true,
        });
      }
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [analytics, summary, connectedCount, recommendations, base]);

  const handleRecommendationAction = (rec: DashboardRecommendation) => {
    acceptRec.mutate(rec.id);

    switch (rec.action) {
      case 'generate_post': {
        const guidance = rec.metadata?.guidance ?? rec.description;
        const tmpl = rec.metadata?.templateType;
        const qs = `guidance=${encodeURIComponent(guidance)}${tmpl ? `&templateType=${encodeURIComponent(tmpl)}` : ''}`;
        router.push(`${base}/create?${qs}`);
        break;
      }
      case 'generate_from_data':
        router.push(`${base}/sources`);
        break;
      case 'generate_content':
        router.push(`${base}/create`);
        break;
      case 'setup_channels':
        router.push(`${base}/settings/channels`);
        break;
      case 'add_data':
        router.push(`${base}/sources`);
        break;
      case 'review_drafts':
        router.push(`${base}/planner`);
        break;
      case 'schedule_drafts':
        router.push(`${base}/planner`);
        break;
      case 'listing_campaign': {
        const params = new URLSearchParams();
        if (rec.metadata?.listingDataItemId) params.set('listingId', rec.metadata.listingDataItemId);
        if (rec.metadata?.campaignType) params.set('type', rec.metadata.campaignType);
        const qs = params.toString();
        router.push(`${base}/listing-campaign${qs ? `?${qs}` : ''}`);
        break;
      }
      case 'draft_gbp_reply':
        document.getElementById('gbp-dashboard-widget')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'setup_integrations':
        router.push(`${base}/settings/integrations`);
        break;
      default:
        router.push(`${base}/create`);
    }
  };

  const handleDismissRecommendation = (recId: string) => {
    dismissRec.mutate({ recId });
  };

  const handleNextAction = (action: NextActionItem) => {
    if (action.href) {
      router.push(action.href);
    } else if (action.action) {
      const rec = recommendations?.recommendations.find((r) => r.action === action.action);
      if (rec) handleRecommendationAction(rec);
      else if (action.action === 'toggle_autopilot') {
        router.push(`${base}/autopilot`);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* 1. Onboarding welcome */}
      {showWelcome && (
        <OnboardingWelcome
          clientId={clientId}
          onDismiss={() => {
            setShowWelcome(false);
            router.replace(base, { scroll: false });
          }}
        />
      )}

      {/* 2. Page header */}
      <div>
        <h1 className="text-xl font-bold text-white-100">{client.name}</h1>
        <p className="text-sm text-white-40 mt-1">Here&apos;s what Squadpitch recommends based on your business and connected sources</p>
      </div>

      {/* 3. Setup progress — hidden once all steps complete */}
      <SetupProgress
        hasWebsite={Boolean(client.brandProfile?.website)}
        hasChannels={enabledChannels.length > 0}
        hasSources={(summary?.totalDataItems ?? 0) > 0}
        channelCount={enabledChannels.length}
        connectedCount={connectedCount}
        sourceCount={summary?.totalDataItems ?? 0}
        base={base}
      />

      {/* 4. Needs Attention — slim alert style */}
      {attentionItems.length > 0 && (
        <div className="card p-3 border-white-10">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-semibold text-white-100 uppercase tracking-wider">
                Needs Attention
              </span>
            </div>
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white-5 border border-white-10 hover:border-white-20 hover:bg-white-10 transition-all group"
              >
                <span className={`text-sm font-bold ${item.accent}`}>{item.count}</span>
                <span className="text-xs text-white-60 group-hover:text-white-100 transition-colors">
                  {item.label}
                </span>
                <ChevronRight className="w-3 h-3 text-white-20" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 5. System Status — channels + integrations combined */}
      <SystemStatusCard
        clientId={clientId}
        enabledChannels={enabledChannels}
        connectionStatus={connectionStatus}
        connectedCount={connectedCount}
        disconnectedCount={disconnectedCount}
        integrationStatus={integrationStatus}
        isRE={isRE}
        listingSourceCount={listingData?.sources?.length ?? 0}
        cloudStorageConnected={
          (genericIntegrations ?? []).some(
            (i) => (i.type === 'google_drive' || i.type === 'dropbox') && i.isActive,
          )
        }
        base={base}
      />

      {/* 5b. Autopilot Status */}
      <AutopilotStatusCard clientId={clientId} base={base} />

      {/* 5c. Autopilot Campaign Recommendations */}
      {isRE && <AutopilotCampaignsSection clientId={clientId} />}

      {/* 6. Opportunities — MOST PROMINENT */}
      <OpportunitiesSection
        nextActions={nextActions}
        topRecommendation={topRecommendation}
        autopilot={summary?.autopilot ? {
          enabled: summary.autopilot.enabled,
          draftsThisWeek: summary.autopilot.draftsThisWeek,
          maxDraftsPerWeek: summary.autopilot.maxDraftsPerWeek,
        } : undefined}
        onNextAction={handleNextAction}
        onRecommendationAction={handleRecommendationAction}
        onDismissRecommendation={handleDismissRecommendation}
      />

      {/* 7. Google Business Profile Widget */}
      {integrationStatus?.gbp?.status === 'connected' && (
        <div id="gbp-dashboard-widget">
          <GBPDashboardWidget clientId={clientId} />
        </div>
      )}

      {/* 8. Listing Opportunities (RE only) */}
      {isRE && <ListingOpportunitiesWidget clientId={clientId} />}

      {/* 9. Weekly Snapshot */}
      <WeeklySnapshot analytics={analytics} recommendations={recommendations} base={base} />

      {/* 10. Content & Campaigns */}
      <ContentActivitySection
        drafts={drafts}
        draftsLoading={draftsLoading}
        upcomingPosts={upcomingPosts}
        activeCampaigns={activeCampaigns}
        base={base}
        isRE={isRE}
        onDuplicate={(draftId) => duplicate.mutate(draftId)}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════════

// ── Weekly Snapshot ───────────────────────────────────────────────────────

function WeeklySnapshot({
  analytics,
  recommendations,
  base,
}: {
  analytics: ReturnType<typeof useClientAnalytics>['data'];
  recommendations: DashboardRecommendationsResponse | undefined;
  base: string;
}) {
  const summary = recommendations?.summary;
  const published = summary?.publishedThisWeek ?? 0;
  const scheduled = summary?.scheduledUpcoming ?? 0;
  const target = 5;
  const pct = Math.min(100, Math.round((published / target) * 100));

  const pending = analytics?.byStatus?.PENDING_REVIEW ?? 0;
  const approvalRate = Math.round((analytics?.approvalRate ?? 0) * 100);
  const pipelineSize = analytics?.total ?? 0;

  return (
    <div className="card p-5 border-white-10">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-accent-green-110" />
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          Weekly Snapshot
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-xs text-white-40 mb-1">Posts this week</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white-100">{published}</span>
            <span className="text-xs text-white-40">/ {target}</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-white-40 mb-1">Approval rate</p>
          <span className="text-2xl font-bold text-white-100">{approvalRate}%</span>
        </div>
        <div>
          <p className="text-xs text-white-40 mb-1">Pipeline</p>
          <span className="text-2xl font-bold text-white-100">{pipelineSize}</span>
        </div>
        <div>
          <p className="text-xs text-white-40 mb-1">Needs review</p>
          <span className={`text-2xl font-bold ${pending > 0 ? 'text-yellow-400' : 'text-white-100'}`}>
            {pending}
          </span>
        </div>
      </div>

      {/* Weekly progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 rounded-full bg-white-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 100 ? 'bg-accent-green-110' : pct >= 60 ? 'bg-yellow-400' : 'bg-orange-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className={pct >= 100 ? 'text-accent-green-110 font-medium' : 'text-white-40'}>
            {pct >= 100
              ? 'Weekly target reached!'
              : published === 0
                ? "You're below your target this week"
                : `${pct}% of weekly target`}
          </span>
          {scheduled > 0 && (
            <Link
              href={`${base}/planner`}
              className="text-white-30 hover:text-accent-green-110 transition-colors"
            >
              +{scheduled} scheduled
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
