'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { OnboardingWelcome } from '@/components/studio/OnboardingWelcome';
import {
  Sparkles,
  Send,
  CopyPlus,
  Pencil,
  Check,
  LinkIcon,
  FileText,
  ChevronRight,
  Zap,
  Target,
  Calendar,
  BarChart3,
  Eye,
  Clock,
  Megaphone,
  AlertCircle,
} from 'lucide-react';
import {
  useClient,
  useDrafts,
  useClientAnalytics,
  useChannelSettings,
  useDashboardRecommendations,
  useApproveDraft,
  usePublishDraft,
  useScheduleDraft,
  useDuplicateDraft,
  useAcceptRecommendation,
  type Draft,
  type DashboardRecommendation,
  type DashboardRecommendationsResponse,
} from '@/hooks/useSquadpitch';
import { groupDraftsByCampaign } from '@/components/studio/campaignGrouping';
import { SetupProgress } from '@/components/studio/SetupProgress';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

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
  const { data: recommendations } = useDashboardRecommendations(clientId);
  const duplicate = useDuplicateDraft();
  const acceptRec = useAcceptRecommendation(clientId);

  if (!client) return null;
  const base = `/workspaces/${clientId}`;

  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];
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
    return items;
  }, [analytics, allDrafts, base]);

  // Top recommendation (1 high-confidence rec, not duplicating Next Actions)
  const topRecommendation = useMemo(() => {
    if (!recommendations?.recommendations) return null;
    const high = recommendations.recommendations.find((r) => r.confidence === 'high');
    return high ?? recommendations.recommendations[0] ?? null;
  }, [recommendations]);

  // ── Compute Next Actions from real state ──────────────────────────────
  const nextActions = useMemo(() => {
    const items: {
      id: string;
      icon: React.ReactNode;
      title: string;
      description: string;
      href?: string;
      action?: string;
      cta: string;
      priority: number;
      accent?: string;
      sourceHint?: string;
    }[] = [];

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
      });
    }

    if (enabledChannels.length === 0 && items.length < 4) {
      items.push({
        id: 'setup-channels',
        icon: <LinkIcon className="w-5 h-5" />,
        title: 'Connect a publishing channel',
        description: 'Link Instagram, TikTok, or LinkedIn to start publishing',
        href: `${base}/settings/media`,
        cta: 'Connect',
        priority: 6,
        accent: 'text-blue-400 bg-blue-400/15',
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
        });
      }
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [analytics, summary, enabledChannels, recommendations, base]);

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
        router.push(`${base}/settings/media`);
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
      default:
        router.push(`${base}/create`);
    }
  };

  const handleNextAction = (action: (typeof nextActions)[number]) => {
    if (action.href) {
      router.push(action.href);
    } else if (action.action) {
      const rec = recommendations?.recommendations.find((r) => r.action === action.action);
      if (rec) handleRecommendationAction(rec);
      else if (action.action === 'toggle_autopilot') {
        router.push(`${base}/sources`);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Onboarding welcome */}
      {showWelcome && (
        <OnboardingWelcome
          clientId={clientId}
          onDismiss={() => {
            setShowWelcome(false);
            router.replace(base, { scroll: false });
          }}
        />
      )}

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white-100">{client.name}</h1>
        <p className="text-sm text-white-40 mt-1">Here&apos;s what Squadpitch recommends based on your business and connected sources</p>
      </div>

      {/* Setup progress — hidden once all steps complete */}
      <SetupProgress
        hasWebsite={Boolean(client.brandProfile?.website)}
        hasChannels={enabledChannels.length > 0}
        hasSources={(summary?.totalDataItems ?? 0) > 0}
        channelCount={enabledChannels.length}
        sourceCount={summary?.totalDataItems ?? 0}
        base={base}
      />

      {/* Next Actions — AI Recommended */}
      {nextActions.length > 0 && (
        <div className="card p-6 bg-gradient-to-br from-accent-green-110/8 via-transparent to-transparent border-accent-green-110/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-accent-green-110" />
            <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
              Next Actions
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
              Based on your sources
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {nextActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleNextAction(action)}
                className="flex items-center gap-3 p-4 rounded-xl bg-white-5 border border-white-10 hover:border-white-20 hover:bg-white-10 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${action.accent ?? 'text-accent-green-110 bg-accent-green-110/15'}`}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white-100 group-hover:text-white transition-colors">
                    {action.title}
                  </p>
                  <p className="text-xs text-white-40 mt-0.5">{action.description}</p>
                  {action.sourceHint && (
                    <p className="text-[10px] text-accent-green-110/70 mt-0.5">{action.sourceHint}</p>
                  )}
                </div>
                <span className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  {action.cta}
                </span>
                <ChevronRight className="w-4 h-4 text-white-20 flex-shrink-0 group-hover:hidden" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Needs Attention */}
      {attentionItems.length > 0 && (
        <div className="card p-5 border-white-10">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
              Needs Attention
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {attentionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white-5 border border-white-10 hover:border-white-20 hover:bg-white-10 transition-all group"
              >
                <span className={`text-lg font-bold ${item.accent}`}>{item.count}</span>
                <span className="text-sm text-white-60 group-hover:text-white-100 transition-colors">
                  {item.label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white-20 ml-1" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Snapshot */}
      <WeeklySnapshot analytics={analytics} recommendations={recommendations} base={base} />

      {/* Coming Up — scheduled posts + active campaigns */}
      {(upcomingPosts.length > 0 || activeCampaigns.length > 0) && (
        <div className="card p-5 border-white-10">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
              Coming Up
            </h2>
          </div>

          {/* Upcoming scheduled posts */}
          {upcomingPosts.length > 0 && (
            <div className="space-y-2 mb-4">
              {upcomingPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`${base}/planner`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white-5 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white-80 truncate">
                      {post.body?.slice(0, 60) || post.channel}
                    </p>
                    <p className="text-[11px] text-white-30">
                      {post.channel} · {new Date(post.scheduledFor!).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white-20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}

          {/* Active campaigns */}
          {activeCampaigns.length > 0 && (
            <div className={upcomingPosts.length > 0 ? 'pt-3 border-t border-white-10' : ''}>
              <div className="flex items-center gap-2 mb-2">
                <Megaphone className="w-3.5 h-3.5 text-accent-green-110" />
                <span className="text-xs font-medium text-white-60">
                  {activeCampaigns.length} active campaign{activeCampaigns.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="space-y-1.5">
                {activeCampaigns.slice(0, 3).map((campaign) => (
                  <Link
                    key={campaign.campaignId}
                    href={`${base}/campaigns`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white-5 transition-colors group"
                  >
                    <span className="text-sm text-white-80 group-hover:text-white-100 transition-colors truncate">
                      {campaign.campaignName}
                    </span>
                    <span className="text-[11px] text-white-30 flex-shrink-0 ml-2">
                      {campaign.drafts.length} post{campaign.drafts.length !== 1 ? 's' : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Recommendation — slim, high-confidence */}
      {topRecommendation && (
        <button
          onClick={() => handleRecommendationAction(topRecommendation)}
          className="w-full card p-4 border-white-10 hover:border-white-20 hover:bg-white-5 transition-all text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-green-110/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-accent-green-110" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white-100 group-hover:text-white transition-colors truncate">
                  {topRecommendation.title}
                </p>
                {topRecommendation.confidence === 'high' && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent-green-110/15 text-accent-green-110">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-white-40 mt-0.5 truncate">
                {topRecommendation.reasons?.[0] ?? topRecommendation.reason ?? topRecommendation.description}
              </p>
              {topRecommendation.sourceLabel && (
                <p className="text-[10px] text-accent-green-110/70 mt-0.5">
                  Based on your {topRecommendation.sourceLabel.toLowerCase()}
                </p>
              )}
            </div>
            <span className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              {topRecommendation.actionLabel}
            </span>
            <ChevronRight className="w-4 h-4 text-white-20 flex-shrink-0 group-hover:hidden" />
          </div>
        </button>
      )}

      {/* Recent drafts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-green-110" />
            <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
              Recent Drafts
            </h2>
            {drafts && drafts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
                {drafts.length} latest
              </span>
            )}
          </div>
          <Link
            href={`${base}/planner`}
            className="text-xs text-accent-green-110 hover:underline"
          >
            View all
          </Link>
        </div>

        {draftsLoading && (
          <div className="flex items-center gap-2 py-4">
            <LoadingSpinner size="sm" />
            <span className="text-white-40 text-sm">Loading...</span>
          </div>
        )}

        {drafts && drafts.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-sm text-white-40 mb-4">No posts yet. Create your first one:</p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href={`${base}/create`}
                className="px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-dark text-sm font-semibold hover:bg-accent-green-110/90 transition-colors"
              >
                Create a quick post
              </Link>
              <Link
                href={isRE ? `${base}/listing-campaign` : `${base}/campaigns`}
                className="px-4 py-2.5 rounded-xl bg-white-10 text-white-100 text-sm font-semibold hover:bg-white-20 transition-colors"
              >
                {isRE ? 'Create a listing campaign' : 'Create a campaign'}
              </Link>
            </div>
          </div>
        )}

        {drafts && drafts.length > 0 && (
          <div className="space-y-2">
            {drafts.map((d) => (
              <DraftCard
                key={d.id}
                draft={d}
                base={base}
                onDuplicate={() => duplicate.mutate(d.id)}
              />
            ))}
          </div>
        )}
      </div>
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

// ── Draft Card ───────────────────────────────────────────────────────────

function DraftCard({
  draft,
  base,
  onDuplicate,
}: {
  draft: Draft;
  base: string;
  onDuplicate: () => void;
}) {
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  const approve = useApproveDraft(draft.id);
  const publish = usePublishDraft(draft.id);
  const schedule = useScheduleDraft(draft.id);

  const canEdit = draft.status === 'DRAFT' || draft.status === 'PENDING_REVIEW';
  const canApprove = draft.status === 'PENDING_REVIEW';
  const canSchedule = draft.status === 'APPROVED';
  const canPublish = draft.status === 'APPROVED' || draft.status === 'SCHEDULED';
  const isPending = approve.isPending || publish.isPending || schedule.isPending;

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-white-10 text-white-60',
    PENDING_REVIEW: 'bg-yellow-500/10 text-yellow-400',
    APPROVED: 'bg-green-500/10 text-green-400',
    SCHEDULED: 'bg-blue-500/10 text-blue-400',
    PUBLISHED: 'bg-accent-green-110/10 text-accent-green-110',
    REJECTED: 'bg-red-500/10 text-red-400',
    FAILED: 'bg-red-500/10 text-red-400',
  };

  const handleSchedule = () => {
    if (scheduleDate) {
      schedule.mutate(new Date(scheduleDate).toISOString());
      setShowSchedule(false);
      setScheduleDate('');
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap mb-1.5">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[draft.status] ?? 'bg-white-10 text-white-60'}`}>
          {draft.status.replace(/_/g, ' ')}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60">
          {draft.channel}
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white-10 text-white-60">
          {draft.kind}
        </span>
        <span className="text-xs text-white-40 ml-auto">
          {new Date(draft.createdAt).toLocaleString()}
        </span>
      </div>

      <p className="text-sm text-white-80 line-clamp-2 mb-3">
        {draft.body || <span className="italic text-white-40">(empty)</span>}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && (
          <Link
            href={`${base}/planner`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </Link>
        )}
        {canApprove && (
          <button
            onClick={() => approve.mutate()}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
            Approve
          </button>
        )}
        {canSchedule && !showSchedule && (
          <button
            onClick={() => setShowSchedule(true)}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors disabled:opacity-50"
          >
            <Calendar className="w-3 h-3" />
            Schedule
          </button>
        )}
        {canPublish && (
          <button
            onClick={() => publish.mutate()}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-medium hover:bg-accent-green-110/20 transition-colors disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            Publish
          </button>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            onDuplicate();
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
        >
          <CopyPlus className="w-3 h-3" />
          Duplicate
        </button>
      </div>

      {/* Inline schedule picker */}
      {showSchedule && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="datetime-local"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="px-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
          />
          <button
            onClick={handleSchedule}
            disabled={!scheduleDate || schedule.isPending}
            className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            onClick={() => {
              setShowSchedule(false);
              setScheduleDate('');
            }}
            className="px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
