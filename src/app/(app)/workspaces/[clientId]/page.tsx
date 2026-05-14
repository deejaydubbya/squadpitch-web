'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  ArrowRight,
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
  useSuiteFlags,
  type DashboardRecommendation,
  type DashboardRecommendationsResponse,
} from '@/hooks/useSquadpitch';
import { useInboxStats } from '@/hooks/useInbox';
import { useGenericIntegrations } from '@/hooks/useIntegrations';
import { groupDraftsByCampaign } from '@/components/studio/campaignGrouping';
import { AutopilotStatusCard } from '@/components/studio/AutopilotStatusCard';
import { ContentActivitySection } from '@/components/studio/ContentActivitySection';
import { RecentSitesWidget } from '@/components/sites/RecentSitesWidget';
import { PostOnboardingChecklist } from '@/components/studio/PostOnboardingChecklist';
import { deriveActivationState } from '@/lib/activationState';
import { useSubscription, useUsage } from '@/hooks/useBilling';
import { PlanBadge } from '@/components/billing/PlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { trackActivationEvent } from '@/lib/activationTracking';
import type { NextActionItem } from '@/components/studio/OpportunitiesSection';

export default function OverviewPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarded = searchParams.get('onboarded') === 'true';

  // Backward compat: redirect ?onboarded=true to /getting-started
  useEffect(() => {
    if (isOnboarded) {
      router.replace(`/workspaces/${clientId}/getting-started`);
    }
  }, [isOnboarded, clientId, router]);

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
  const { data: suiteFlags } = useSuiteFlags(clientId);
  // Only poll inbox stats if the workspace has the inbox module on.
  const { data: inboxStats } = useInboxStats(clientId, Boolean(suiteFlags?.inbox));
  const { data: genericIntegrations } = useGenericIntegrations();
  const { data: subscription } = useSubscription();
  const currentTier = subscription?.tier ?? 'FREE';
  const duplicate = useDuplicateDraft();
  const acceptRec = useAcceptRecommendation(clientId);
  const dismissRec = useDismissRecommendation(clientId);

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-white-20 border-t-accent-green-110 rounded-full animate-spin" />
      </div>
    );
  }
  const base = `/workspaces/${clientId}`;

  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];
  const connectedCount = connectionStatus.size;
  const disconnectedCount = enabledChannels.filter((c) => !connectionStatus.get(c.channel)).length;
  const summary = recommendations?.summary;
  const isRE = client.industryKey === 'real_estate';

  // ── Activation state ────────────────────────────────────────────────
  const activation = deriveActivationState({
    clientId,
    onboardedParam: isOnboarded,
    analytics,
    connectedChannelCount: connectedCount,
    scheduledUpcoming: summary?.scheduledUpcoming ?? 0,
    publishedThisWeek: summary?.publishedThisWeek ?? 0,
  });
  const isFirstWinMode = !activation.isActivatedUser && activation.shouldShowFirstWinMode;
  const isMomentumMode = activation.isActivatedUser;
  const pendingDrafts = (analytics?.byStatus?.DRAFT ?? 0) + (analytics?.byStatus?.APPROVED ?? 0) + (analytics?.byStatus?.PENDING_REVIEW ?? 0);

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
    const newLeads = inboxStats?.unreadCount ?? 0;
    if (suiteFlags?.inbox && newLeads > 0) {
      items.push({
        label: newLeads === 1 ? 'New lead' : 'New leads',
        count: newLeads,
        href: `${base}/inbox`,
        accent: 'text-blue-400',
      });
    }
    const pending = analytics?.byStatus?.PENDING_REVIEW ?? 0;
    if (pending > 0) {
      items.push({ label: 'Needs review', count: pending, href: `${base}/planner`, accent: 'text-yellow-400' });
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
  }, [analytics, allDrafts, base, disconnectedCount, inboxStats, suiteFlags]);

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
        // Recommendation-driven single posts. If the recommendation
        // points at a specific data item (a property, content asset,
        // etc.), thread it through as the source so the assistant
        // can prefill. Otherwise fall back to a guidance-only
        // single-post intent.
        const params = new URLSearchParams({ intent: 'single_post' });
        const guidance = rec.metadata?.guidance ?? rec.description;
        if (guidance) params.set('guidance', guidance);
        if (rec.metadata?.templateType) params.set('templateType', rec.metadata.templateType);
        if (rec.metadata?.dataItemId || rec.metadata?.listingDataItemId) {
          const propertyId =
            rec.metadata?.listingDataItemId ?? rec.metadata?.dataItemId;
          const isProperty =
            rec.sourceType === 'listing' ||
            rec.sourceType === 'property' ||
            !!rec.metadata?.listingDataItemId;
          params.set('sourceType', isProperty ? 'property' : 'content_asset');
          if (propertyId) params.set('sourceId', propertyId);
        }
        router.push(`${base}/create?${params.toString()}`);
        break;
      }
      case 'generate_from_data':
        router.push(`${base}/data`);
        break;
      case 'generate_content':
        router.push(`${base}/create`);
        break;
      case 'setup_channels':
        router.push(`${base}/settings/channels`);
        break;
      case 'add_data':
        router.push(`${base}/data`);
        break;
      case 'review_drafts':
        router.push(`${base}/planner`);
        break;
      case 'schedule_drafts':
        router.push(`${base}/planner`);
        break;
      case 'listing_campaign': {
        const params = new URLSearchParams({ intent: 'campaign' });
        if (rec.metadata?.listingDataItemId) {
          params.set('sourceType', 'property');
          params.set('sourceId', rec.metadata.listingDataItemId);
        }
        if (rec.metadata?.campaignType) params.set('campaignType', rec.metadata.campaignType);
        router.push(`${base}/create?${params.toString()}`);
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
    <div className="space-y-6 max-w-5xl">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-white-100">{client.name}</h1>
        <p className="text-sm text-white-40 mt-1">
          {isMomentumMode
            ? "Here's what's happening with your content."
            : 'Get started by creating and publishing your first post.'}
        </p>
      </div>

      {/* ── Quick Idea Input ── */}
      <CampaignInput base={base} />

      {/* ── 1. Primary Action — always visible ── */}
      <div className="flex flex-col gap-2">
        <Link
          href={`${base}/create`}
          className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-accent-green-110/10 border border-accent-green-110/25 hover:border-accent-green-110/40 transition-all group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-accent-green-110" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Create content</p>
              <p className="text-xs text-white-40 mt-0.5">
                Create a guided post or campaign from your listings, content assets, or ideas.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-green-110 text-sp-bg text-sm font-semibold flex-shrink-0 group-hover:bg-accent-green-120 transition-colors">
            Create Content
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`${base}/create?intent=campaign`}
            className="px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-80 text-xs font-semibold hover:bg-white-10 hover:border-white-20 transition-colors"
          >
            New Campaign
          </Link>
          <Link
            href={`${base}/create?intent=single_post`}
            className="px-3 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-80 text-xs font-semibold hover:bg-white-10 hover:border-white-20 transition-colors"
          >
            New Single Post
          </Link>
        </div>
      </div>

      {/* ── Post-onboarding checklist (hidden once complete) ── */}
      <PostOnboardingChecklist
        clientId={clientId}
        base={base}
        activation={activation}
        hasWeeklyPlan={(allDrafts?.filter((d) => d.status !== 'PUBLISHED').length ?? 0) >= 3}
        autopilotEnabled={summary?.autopilot?.enabled ?? false}
      />

      {/* ── 2. Needs Attention ── */}
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

      {/* ── Usage Widget ── */}
      <DashboardUsageWidget clientId={clientId} base={base} />

      {/* ── 3. Weekly Snapshot ── */}
      <WeeklySnapshot analytics={analytics} recommendations={recommendations} base={base} />

      {/* ── 4. Autopilot Status ── */}
      <AutopilotStatusCard clientId={clientId} base={base} />

      {/* ── Recent landing pages (auto-hides when flag is off
          or workspace has no pages yet) ── */}
      <RecentSitesWidget clientId={clientId} base={base} />

      {/* ── 5. Content & Campaigns ── */}
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

// ── Campaign Quick Input ──────────────────────────────────────────────

// ── Dashboard Usage Widget ──────────────────────────────────────────

function DashboardUsageWidget({ clientId, base }: { clientId: string; base: string }) {
  const { data: usage } = useUsage();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!usage || trackedRef.current) return;
    trackedRef.current = true;
    trackActivationEvent('dashboard_usage_viewed', { clientId }, { once: true });
  }, [usage, clientId]);

  if (!usage) return null;

  return (
    <Link
      href={`${base}/settings/billing`}
      className="card p-4 border-white-10 hover:border-white-20 transition-colors block"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-white-40 uppercase tracking-wider">Plan Usage</span>
        <PlanBadge tier={usage.tier} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <UsageMeter label="Posts" current={usage.usage.posts} limit={usage.limits.posts} />
        <UsageMeter label="Images" current={usage.usage.images} limit={usage.limits.images} />
        <UsageMeter label="Videos" current={usage.usage.videos} limit={usage.limits.videos} />
      </div>
    </Link>
  );
}

// ── Campaign Quick Input ──────────────────────────────────────────────

function CampaignInput({ base }: { base: string }) {
  const router = useRouter();
  const [campaignInput, setCampaignInput] = useState('');

  const handleSubmit = () => {
    const trimmed = campaignInput.trim();
    if (!trimmed) return;
    // The assistant can interpret raw URLs (listing import) directly
    // from the `prompt` param, so we don't need to detect URLs here —
    // we always pass the input as `prompt` and let the assistant pick
    // the right source. `sourceType=idea` is the safe default; if the
    // input is a URL the assistant's input parser will re-route it
    // into the property-import path on the next step.
    router.push(
      `${base}/create?intent=campaign&sourceType=idea&prompt=${encodeURIComponent(trimmed)}`,
    );
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={campaignInput}
        onChange={(e) => setCampaignInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder="Describe what you want to create, paste a listing URL, or mention a saved content asset…"
        className="flex-1 px-4 py-3 rounded-xl bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110 placeholder:text-white-30"
      />
      <button
        onClick={handleSubmit}
        disabled={!campaignInput.trim()}
        className="px-4 py-3 rounded-xl bg-accent-green-110 text-sp-surface text-sm font-semibold hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
      >
        Start Campaign
      </button>
    </div>
  );
}

