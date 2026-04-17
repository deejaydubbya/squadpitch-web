'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { OnboardingWelcome } from '@/components/studio/OnboardingWelcome';
import {
  Wand2,
  Calendar,
  Library,
  BarChart3,
  ArrowRight,
  Loader2,
  Sparkles,
  Settings,
  Image as ImageIcon,
  Send,
  CopyPlus,
  Pencil,
  Check,
  Database,
  LinkIcon,
  TrendingUp,
  FileText,
  ChevronRight,
  Zap,
  Target,
  Film,
  Home,
  Clock,
  RefreshCw,
  Eye,
  Activity,
  Lightbulb,
} from 'lucide-react';
import {
  useClient,
  useDrafts,
  useClientAnalytics,
  useChannelSettings,
  useGenerateContent,
  useAnalyticsOverview,
  useAssets,
  useDashboardRecommendations,
  useDashboardActions,
  usePerformanceInsights,
  useApproveDraft,
  usePublishDraft,
  useScheduleDraft,
  useDuplicateDraft,
  useBusinessDataLabels,
  useAutopilotSettings,
  useUpdateAutopilotSettings,
  useRefreshListingFeed,
  useAcceptRecommendation,
  type Channel,
  type Draft,
  type MediaAsset,
  type DashboardRecommendation,
  type DashboardAction,
  type DashboardRecommendationsResponse,
} from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatusBanner } from '@/components/common/StatusBanner';
import { TechStackSection } from '@/components/studio/TechStackSection';

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
  const { data: analytics } = useClientAnalytics(clientId);
  const { data: channels } = useChannelSettings(clientId);
  const { data: overview } = useAnalyticsOverview(clientId, '30d');
  const { data: recentAssets } = useAssets(clientId, { limit: 4, status: 'READY' });
  const { data: recommendations } = useDashboardRecommendations(clientId);
  const { data: actionsData } = useDashboardActions(clientId);
  const { data: apSettings } = useAutopilotSettings(clientId);
  const { data: perfInsights } = usePerformanceInsights(clientId);
  const generate = useGenerateContent();
  const duplicate = useDuplicateDraft();
  const acceptRec = useAcceptRecommendation(clientId);

  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState(false);

  if (!client) return null;
  const base = `/workspaces/${clientId}`;

  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];
  const summary = recommendations?.summary;
  const isAPEnabled = apSettings?.enabled ?? summary?.autopilot?.enabled ?? false;

  const quickLinks = [
    { href: `${base}/create`, icon: Wand2, label: 'Create', desc: 'Generate posts' },
    { href: `${base}/planner`, icon: Calendar, label: 'Planner', desc: 'Schedule & queue' },
    { href: `${base}/library`, icon: Library, label: 'Library', desc: 'All content' },
    { href: `${base}/assets`, icon: ImageIcon, label: 'Media', desc: 'Images & video' },
    { href: `${base}/analytics`, icon: BarChart3, label: 'Analytics', desc: 'Performance' },
    { href: `${base}/settings/brand`, icon: Settings, label: 'Settings', desc: 'Brand & channels' },
  ];

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
    }[] = [];

    const approved = analytics?.byStatus?.APPROVED ?? 0;
    if (approved > 0) {
      items.push({
        id: 'publish-approved',
        icon: <Send className="w-5 h-5" />,
        title: `Publish ${approved} approved post${approved > 1 ? 's' : ''}`,
        description: 'Approved content is ready to go live',
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
        href: `${base}/library`,
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
        title: `Create posts from ${unused} unused opportunit${unused > 1 ? 'ies' : 'y'}`,
        description: 'Business data ready for content creation',
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

    const hasData = (summary?.totalDataItems ?? 0) > 0;
    if (!isAPEnabled && hasData && items.length < 4) {
      items.push({
        id: 'enable-autopilot',
        icon: <Zap className="w-5 h-5" />,
        title: 'Turn on Autopilot',
        description: 'Let Squadpitch generate and plan content automatically',
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
        items.push({
          id: rec.id,
          icon: <Sparkles className="w-5 h-5" />,
          title: rec.title,
          description: rec.description,
          action: rec.action,
          cta: rec.actionLabel,
          priority: 10 + rec.priority,
          accent: 'text-accent-green-110 bg-accent-green-110/15',
        });
      }
    }

    return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [analytics, summary, isAPEnabled, enabledChannels, recommendations, base]);

  const handleGenerateSuggested = async () => {
    if (enabledChannels.length === 0) return;
    setIsGenerating(true);
    setGenError(null);
    setGenSuccess(false);

    try {
      const channel = enabledChannels[0].channel as Channel;
      const topics = [
        'Create a data-driven post using our best business data',
        'Share an insight that demonstrates our expertise',
        'Create an engaging post that drives conversation',
      ];
      for (const topic of topics) {
        await generate.mutateAsync({
          clientId,
          kind: 'POST',
          channel,
          guidance: `[Goal: Growth] ${topic}`,
        });
      }
      setGenSuccess(true);
      fetch('/api/proxy/workspaces/' + clientId + '/batch-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: topics.length }),
      }).catch(() => {});
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecommendationAction = (rec: DashboardRecommendation) => {
    // Track acceptance (fire-and-forget)
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
        router.push(`${base}/business-data`);
        break;
      case 'generate_content':
        router.push(`${base}/create`);
        break;
      case 'setup_channels':
        router.push(`${base}/settings/media`);
        break;
      case 'add_data':
        router.push(`${base}/business-data`);
        break;
      case 'review_drafts':
        router.push(`${base}/library`);
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
      // Find matching recommendation for action dispatch
      const rec = recommendations?.recommendations.find((r) => r.action === action.action);
      if (rec) handleRecommendationAction(rec);
      else if (action.action === 'toggle_autopilot') {
        // handled by AutopilotCard directly, but navigate as fallback
        router.push(`${base}/business-data`);
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

      {/* ═══════════════ TOP ═══════════════ */}

      {/* Next Actions — AI Recommended */}
      {nextActions.length > 0 && (
        <div className="card p-6 bg-gradient-to-br from-accent-green-110/8 via-transparent to-transparent border-accent-green-110/20">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-accent-green-110" />
            <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
              Next Actions
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-green-110/10 text-accent-green-110">
              AI Recommended
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

      {/* Opportunities — moved up, action-oriented */}
      {recommendations && recommendations.recommendations.length > 0 && (
        <div className="card p-5 border-white-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-green-110" />
              <h2 className="text-sm font-semibold text-white-60 uppercase tracking-wider">
                Opportunities
              </h2>
              {(summary?.unusedDataCount ?? 0) > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-400/10 text-purple-400">
                  {summary!.unusedDataCount} ready
                </span>
              )}
            </div>
            <button
              onClick={handleGenerateSuggested}
              disabled={isGenerating || enabledChannels.length === 0}
              className="px-4 py-2 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold flex items-center gap-1.5 hover:bg-accent-green-110/20 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Content
                </>
              )}
            </button>
          </div>

          <div className="space-y-2">
            {recommendations.recommendations.slice(0, 3).map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onAction={() => handleRecommendationAction(rec)}
              />
            ))}
          </div>

          {enabledChannels.length === 0 && (
            <p className="text-xs text-white-30 mt-2">
              Enable a channel in{' '}
              <Link href={`${base}/settings/media`} className="text-accent-green-110 hover:underline">
                Settings
              </Link>{' '}
              first.
            </p>
          )}
          {genSuccess && (
            <p className="text-xs text-accent-green-110 mt-2">
              Content ready.{' '}
              <Link href={`${base}/library`} className="underline">View in library</Link>
            </p>
          )}
          {genError && <StatusBanner error={genError} />}
        </div>
      )}

      {/* ═══════════════ UPPER-MIDDLE ═══════════════ */}

      {/* Weekly Snapshot — consolidated stats */}
      <WeeklySnapshot analytics={analytics} recommendations={recommendations} base={base} />

      {/* Content Pipeline + Content Assets + Consistency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ContentPipeline analytics={analytics} base={base} />
        <BusinessDataSnapshot recommendations={recommendations} base={base} clientId={clientId} />
        <ConsistencyTracker recommendations={recommendations} />
      </div>

      {/* ═══════════════ MIDDLE ═══════════════ */}

      {/* Autopilot — prominent full-width card */}
      <AutopilotCard recommendations={recommendations} base={base} clientId={clientId} />

      {/* Quick Actions */}
      {actionsData && actionsData.actions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white-60 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actionsData.actions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                base={base}
              />
            ))}
          </div>
        </div>
      )}

      {/* Media + System Freshness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MediaPreview assets={recentAssets} base={base} recommendations={recommendations} />
        <SystemFreshness recommendations={recommendations} base={base} />
      </div>

      {/* ═══════════════ LOWER ═══════════════ */}

      {/* System Status — real estate workspaces */}
      {client.industryKey === 'real_estate' && recommendations?.summary && (
        <SystemStatus summary={recommendations.summary} base={base} />
      )}

      {/* Performance Insights — lightweight */}
      {perfInsights?.hasEnoughData && perfInsights.insights.length > 0 && (
        <div className="card p-5 border-white-10">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white-60 uppercase tracking-wider">
              Performance Insights
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/10 text-amber-400">
              {perfInsights.totalRated} rated
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {perfInsights.insights.map((insight) => (
              <div
                key={insight.id}
                className="flex items-start gap-2 p-3 rounded-lg bg-white-5"
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  insight.type === 'positive' ? 'bg-accent-green-110' : 'bg-amber-400'
                }`} />
                <div>
                  <p className="text-xs font-medium text-white-80">{insight.text}</p>
                  <p className="text-[11px] text-white-40 mt-0.5">{insight.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent drafts — system output */}
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
            href={`${base}/library`}
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
          <div className="card p-6 text-center text-sm text-white-40">
            No drafts yet.{' '}
            <Link href={`${base}/create`} className="text-accent-green-110 hover:underline">
              Create your first post
            </Link>
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

      {/* Recent Activity — real estate workspaces */}
      {client.industryKey === 'real_estate' && (
        <RecentActivity drafts={drafts} recommendations={recommendations} />
      )}

      {/* Tech Stack */}
      <TechStackSection clientId={clientId} />

      {/* Workspace links */}
      <div>
        <h2 className="text-sm font-semibold text-white-60 uppercase tracking-wider mb-3">
          Workspace
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickLinks.map((ql) => (
            <Link
              key={ql.href}
              href={ql.href}
              className="card-hover p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                <ql.icon className="w-5 h-5 text-accent-green-110" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white-100">{ql.label}</p>
                <p className="text-xs text-white-40">{ql.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white-40" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════════

// ── Weekly Snapshot (replaces 4 stat cards) ──────────────────────────────

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

  const approved =
    (analytics?.byStatus?.APPROVED ?? 0) +
    (analytics?.byStatus?.PUBLISHED ?? 0) +
    (analytics?.byStatus?.SCHEDULED ?? 0);
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

// ── Recommendation Card ──────────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-accent-green-110/15 text-accent-green-110',
  medium: 'bg-yellow-400/15 text-yellow-400',
  low: 'bg-white-10 text-white-40',
};

function RecommendationCard({
  rec,
  onAction,
}: {
  rec: DashboardRecommendation;
  onAction: () => void;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    data: <Database className="w-4 h-4 text-accent-green-110" />,
    frequency: <Calendar className="w-4 h-4 text-blue-400" />,
    setup: <LinkIcon className="w-4 h-4 text-yellow-400" />,
    growth: <BarChart3 className="w-4 h-4 text-purple-400" />,
    workflow: <Check className="w-4 h-4 text-orange-400" />,
    content: <Wand2 className="w-4 h-4 text-accent-green-110" />,
    cadence: <Clock className="w-4 h-4 text-orange-400" />,
    real_estate: <Home className="w-4 h-4 text-accent-green-110" />,
  };

  const reasonText = rec.reasons?.[0] ?? rec.reason;
  const isCampaign = rec.type?.includes('campaign') && rec.type !== 'campaign_hint';

  return (
    <button
      onClick={onAction}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white-5 transition-colors group text-left"
    >
      <div className="flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {iconMap[rec.category] ?? <Sparkles className="w-4 h-4 text-white-40" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-white-80 group-hover:text-white-100 transition-colors truncate">{rec.title}</p>
          {isCampaign && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-400/15 text-purple-400">
              Campaign
            </span>
          )}
          {rec.confidence && rec.confidence !== 'low' && (
            <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${CONFIDENCE_STYLES[rec.confidence]}`}>
              {rec.confidence === 'high' ? 'Recommended' : 'Suggested'}
            </span>
          )}
        </div>
        {reasonText && (
          <p className="text-[11px] text-white-30 mt-0.5 truncate">{reasonText}</p>
        )}
      </div>
      <span className="flex-shrink-0 px-3 py-1.5 rounded-lg text-accent-green-110 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent-green-110/10">
        {rec.actionLabel}
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-white-20 flex-shrink-0 group-hover:hidden" />
    </button>
  );
}

// ── Action Card ──────────────────────────────────────────────────────────

function ActionCard({ action, base }: { action: DashboardAction; base: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    review: <Pencil className="w-5 h-5 text-yellow-400" />,
    publish: <Send className="w-5 h-5 text-accent-green-110" />,
    setup: <LinkIcon className="w-5 h-5 text-blue-400" />,
    data: <Database className="w-5 h-5 text-purple-400" />,
    schedule: <Calendar className="w-5 h-5 text-orange-400" />,
  };

  return (
    <Link
      href={`${base}/${action.actionRoute}`}
      className="card-hover p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-white-10 flex items-center justify-center flex-shrink-0">
        {iconMap[action.type] ?? <ArrowRight className="w-5 h-5 text-white-40" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white-100">{action.title}</p>
        <p className="text-xs text-white-40 line-clamp-1">{action.description}</p>
      </div>
      <span className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-accent-green-110/10 text-accent-green-110 text-xs font-semibold">
        {action.actionLabel}
      </span>
    </Link>
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
            href={`${base}/library`}
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

// ── Content Pipeline ─────────────────────────────────────────────────────

function ContentPipeline({
  analytics,
  base,
}: {
  analytics: ReturnType<typeof useClientAnalytics>['data'];
  base: string;
}) {
  const stages = [
    { label: 'Draft', status: 'DRAFT', color: 'bg-white-20' },
    { label: 'Approved', status: 'APPROVED', color: 'bg-green-500/20' },
    { label: 'Scheduled', status: 'SCHEDULED', color: 'bg-blue-500/20' },
    { label: 'Published', status: 'PUBLISHED', color: 'bg-accent-green-110/20' },
  ];

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-accent-green-110" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          Content Pipeline
        </h3>
      </div>

      <div className="space-y-1.5">
        {stages.map((stage) => {
          const count =
            (analytics?.byStatus as Record<string, number> | undefined)?.[stage.status] ?? 0;
          return (
            <Link
              key={stage.status}
              href={`${base}/library`}
              className="flex items-center gap-2 group"
            >
              <div className={`w-2 h-2 rounded-full ${stage.color} flex-shrink-0`} />
              <span className="text-xs text-white-40 flex-1 group-hover:text-white-60 transition-colors">
                {stage.label}
              </span>
              <span className="text-xs font-semibold text-white-100">{count}</span>
            </Link>
          );
        })}
      </div>

      {/* Visual bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-white-5">
        {stages.map((stage) => {
          const count =
            (analytics?.byStatus as Record<string, number> | undefined)?.[stage.status] ?? 0;
          const total = analytics?.total ?? 1;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={stage.status}
              className={`${stage.color} transition-all`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Content Assets (enhanced with action suggestions) ────────────────────

const DATA_TYPE_LABELS: Record<string, string> = {
  TESTIMONIAL: 'Testimonials',
  CASE_STUDY: 'Case Studies',
  STATISTIC: 'Statistics',
  PRODUCT_LAUNCH: 'Launches',
  PROMOTION: 'Promotions',
  FAQ: 'FAQ',
  TEAM_SPOTLIGHT: 'Team',
  MILESTONE: 'Milestones',
  INDUSTRY_NEWS: 'News',
  EVENT: 'Events',
  CUSTOM: 'Custom',
};

const RE_TYPE_LABELS: Record<string, string> = {
  ...DATA_TYPE_LABELS,
  CUSTOM: 'Listings',
};

const ACTION_SUGGESTIONS: Record<string, string> = {
  TESTIMONIAL: 'Create trust-building post',
  MILESTONE: 'Create celebration content',
  CUSTOM: 'Create listing post',
  STATISTIC: 'Create data-driven post',
  CASE_STUDY: 'Create success story',
  PROMOTION: 'Create promo post',
  EVENT: 'Create event highlight',
  TEAM_SPOTLIGHT: 'Create team spotlight',
  INDUSTRY_NEWS: 'Create thought leadership',
};

function BusinessDataSnapshot({
  recommendations,
  base,
  clientId,
}: {
  recommendations: ReturnType<typeof useDashboardRecommendations>['data'];
  base: string;
  clientId: string;
}) {
  const { data: client } = useClient(clientId);
  const bdLabels = useBusinessDataLabels(clientId);
  const summary = recommendations?.summary;
  const dataByType = summary?.dataByType ?? {};
  const entries = Object.entries(dataByType).filter(([, count]) => (count ?? 0) > 0);
  const isRE = client?.industryKey === 'real_estate';
  const labels = isRE ? RE_TYPE_LABELS : DATA_TYPE_LABELS;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-purple-400" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          Content Assets
        </h3>
      </div>

      {entries.length > 0 ? (
        <>
          <div className="space-y-1.5">
            {entries.slice(0, 5).map(([type, count]) => (
              <Link
                key={type}
                href={`${base}/create?guidance=${encodeURIComponent(ACTION_SUGGESTIONS[type] ?? 'Create post')}`}
                className="flex items-center justify-between group"
              >
                <span className="text-xs text-white-40 group-hover:text-white-60 transition-colors">
                  {count} {labels[type] ?? type}
                </span>
                <span className="text-[10px] text-accent-green-110 opacity-0 group-hover:opacity-100 transition-opacity">
                  {ACTION_SUGGESTIONS[type] ?? 'Create post'} →
                </span>
              </Link>
            ))}
            {entries.length > 5 && (
              <p className="text-[11px] text-white-30">
                +{entries.length - 5} more type{entries.length - 5 > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {(summary?.unusedDataCount ?? 0) > 0 && (
            <p className="text-[11px] text-accent-green-110 font-medium">
              {summary!.unusedDataCount} unused opportunit{summary!.unusedDataCount > 1 ? 'ies' : 'y'} ready
            </p>
          )}

          <Link
            href={`${base}/business-data`}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
          >
            <Wand2 className="w-3 h-3" />
            Generate content from assets
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs text-white-40">
            {isRE
              ? 'Import listings, testimonials, or market data to power your content.'
              : `No data yet. Add testimonials, stats, or ${bdLabels.itemPlural.toLowerCase()}.`}
          </p>
          <Link
            href={`${base}/business-data`}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
          >
            <FileText className="w-3 h-3" />
            {isRE ? 'Import your first listing' : `Add your first ${bdLabels.itemSingular.toLowerCase()}`}
          </Link>
        </>
      )}
    </div>
  );
}

// ── Consistency Tracker ──────────────────────────────────────────────────

function ConsistencyTracker({
  recommendations,
}: {
  recommendations: DashboardRecommendationsResponse | undefined;
}) {
  const summary = recommendations?.summary;
  const published = summary?.publishedThisWeek ?? 0;
  const target = 5;
  const pct = Math.min(100, Math.round((published / target) * 100));

  const upcoming = summary?.scheduledUpcoming ?? 0;
  const projected = published + upcoming;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-orange-400" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          Consistency
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white-100">{published}</span>
          <span className="text-xs text-white-40">/ {target} this week</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-white-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct >= 100
                ? 'bg-accent-green-110'
                : pct >= 60
                  ? 'bg-yellow-400'
                  : 'bg-orange-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px]">
          <span className={pct >= 100 ? 'text-accent-green-110' : 'text-white-40'}>
            {pct >= 100 ? 'Target reached!' : `${pct}% of target`}
          </span>
          {upcoming > 0 && (
            <span className="text-white-30">
              +{upcoming} scheduled
            </span>
          )}
        </div>

        {projected < target && projected > published && (
          <p className="text-[11px] text-white-30">
            With scheduled posts: {projected}/{target}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Autopilot Card (full-width, prominent) ───────────────────────────────

function AutopilotCard({
  recommendations,
  base,
  clientId,
}: {
  recommendations: DashboardRecommendationsResponse | undefined;
  base: string;
  clientId: string;
}) {
  const bdLabels = useBusinessDataLabels(clientId);
  const { data: apSettings } = useAutopilotSettings(clientId);
  const updateSettings = useUpdateAutopilotSettings(clientId);
  const summary = recommendations?.summary;
  const ap = summary?.autopilot;
  const hasData = (summary?.totalDataItems ?? 0) > 0;

  const isEnabled = apSettings?.enabled ?? ap?.enabled ?? false;

  const handleToggle = () => {
    updateSettings.mutate({
      enabled: !isEnabled,
      mode: !isEnabled ? 'draft_assist' : 'off',
    });
  };

  const lastRunAt = ap?.lastActionAt ?? summary?.lastAutopilotAt;
  const lastRunLabel = lastRunAt ? formatTimeAgo(new Date(lastRunAt)) : 'Never';
  const draftsThisWeek = ap?.draftsThisWeek ?? 0;
  const maxPerWeek = ap?.maxDraftsPerWeek ?? 3;
  const coverageGaps = ap?.coverageGaps ?? [];

  // Human-readable status line
  const statusLine = isEnabled
    ? draftsThisWeek > 0
      ? `Autopilot is active — created ${draftsThisWeek} draft${draftsThisWeek > 1 ? 's' : ''} this week`
      : "Autopilot is active — this week's plan is running"
    : hasData
      ? "Autopilot is off — you're manually managing content"
      : 'Autopilot is off — add business data to get started';

  const ctaLabel = isEnabled
    ? 'Review Autopilot Plan'
    : hasData
      ? 'Turn On Autopilot'
      : `Add ${bdLabels.itemPlural}`;

  return (
    <div
      className={`card p-6 border-2 transition-colors ${
        isEnabled
          ? 'border-accent-green-110/30 bg-gradient-to-br from-accent-green-110/5 via-transparent to-transparent'
          : 'border-white-10'
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
            isEnabled ? 'bg-accent-green-110/15 text-accent-green-110' : 'bg-white-10 text-white-40'
          }`}
        >
          <Zap className="w-7 h-7" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-bold text-white-100">Autopilot</h2>
            <div className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-accent-green-110 animate-pulse' : 'bg-white-20'}`} />
            <span className={`text-xs font-medium ${isEnabled ? 'text-accent-green-110' : 'text-white-40'}`}>
              {isEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
          <p className="text-sm text-white-40">{statusLine}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {isEnabled ? (
            <Link
              href={`${base}/business-data`}
              className="px-5 py-2.5 rounded-xl bg-accent-green-110/10 text-accent-green-110 text-sm font-semibold hover:bg-accent-green-110/20 transition-colors"
            >
              {ctaLabel}
            </Link>
          ) : hasData ? (
            <button
              onClick={handleToggle}
              disabled={updateSettings.isPending}
              className="px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-dark text-sm font-semibold hover:bg-accent-green-110/90 transition-colors disabled:opacity-50"
            >
              {updateSettings.isPending ? 'Enabling...' : ctaLabel}
            </button>
          ) : (
            <Link
              href={`${base}/business-data`}
              className="px-5 py-2.5 rounded-xl bg-white-10 text-white-60 text-sm font-semibold hover:bg-white-20 transition-colors"
            >
              {ctaLabel}
            </Link>
          )}

          <button
            onClick={handleToggle}
            disabled={updateSettings.isPending}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              isEnabled ? 'bg-accent-green-110' : 'bg-white-20'
            } ${updateSettings.isPending ? 'opacity-50' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                isEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Details row */}
      {(isEnabled || lastRunAt) && (
        <div className="mt-4 pt-4 border-t border-white-10 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-white-30 uppercase tracking-wider mb-0.5">Last run</p>
            <p className="text-xs font-medium text-white-80">
              {lastRunAt
                ? `Created ${ap?.lastActionType === 'draft' ? 'drafts' : 'content'} · ${lastRunLabel}`
                : 'No runs yet'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white-30 uppercase tracking-wider mb-0.5">This week</p>
            <p className="text-xs font-medium text-white-80">
              {draftsThisWeek}/{maxPerWeek} drafts created
            </p>
          </div>
          <div>
            <p className="text-[10px] text-white-30 uppercase tracking-wider mb-0.5">Next</p>
            <p className="text-xs font-medium text-white-60">
              {!isEnabled
                ? 'Enable to start'
                : !hasData
                  ? 'Waiting for data'
                  : draftsThisWeek >= maxPerWeek
                    ? 'Weekly limit reached'
                    : 'Runs automatically'}
            </p>
          </div>
        </div>
      )}

      {coverageGaps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white-10">
          <span className="text-[10px] font-medium text-white-30 uppercase tracking-wider">
            Opportunity detected
          </span>
          <div className="mt-1 space-y-0.5">
            {coverageGaps.slice(0, 2).map((gap, i) => (
              <p key={i} className="text-[11px] text-white-40">
                {gap}
              </p>
            ))}
          </div>
        </div>
      )}

      {summary?.realEstate?.listingFeedConnected && (
        <div className="mt-3 pt-3 border-t border-white-10">
          <RefreshListingsButton clientId={clientId} />
        </div>
      )}
    </div>
  );
}

function RefreshListingsButton({ clientId }: { clientId: string }) {
  const refresh = useRefreshListingFeed(clientId);
  return (
    <button
      onClick={() => refresh.mutate({})}
      disabled={refresh.isPending}
      className="flex items-center gap-1.5 text-xs font-semibold text-white-40 hover:text-white-100 transition-colors"
    >
      <RefreshCw className={`w-3 h-3 ${refresh.isPending ? 'animate-spin' : ''}`} />
      {refresh.isPending ? 'Refreshing...' : 'Refresh Listings'}
    </button>
  );
}

// ── Media Preview (enhanced) ─────────────────────────────────────────────

function MediaPreview({
  assets,
  base,
  recommendations,
}: {
  assets: MediaAsset[] | undefined;
  base: string;
  recommendations: DashboardRecommendationsResponse | undefined;
}) {
  const recent = assets?.slice(0, 4) ?? [];
  const imageCount = recent.filter((a) => a.assetType === 'image').length;
  const videoCount = recent.filter((a) => a.assetType === 'video').length;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-blue-400" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          Media
        </h3>
        <Link
          href={`${base}/assets`}
          className="ml-auto text-[11px] text-accent-green-110 hover:underline"
        >
          View all
        </Link>
      </div>

      {recent.length > 0 ? (
        <>
          {/* Summary line */}
          <p className="text-xs text-white-60">
            {imageCount > 0 && `${imageCount} image${imageCount > 1 ? 's' : ''}`}
            {imageCount > 0 && videoCount > 0 && ', '}
            {videoCount > 0 && `${videoCount} video${videoCount > 1 ? 's' : ''}`}
            {' '}ready to use
          </p>

          <div className="grid grid-cols-4 gap-1.5">
            {recent.map((asset) => (
              <div
                key={asset.id}
                className="relative aspect-square rounded-lg overflow-hidden bg-white-5"
              >
                {asset.thumbnailUrl || asset.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnailUrl ?? asset.url!}
                    alt={asset.altText ?? asset.filename ?? 'Asset'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-4 h-4 text-white-30" />
                  </div>
                )}
                {asset.assetType === 'video' && (
                  <div className="absolute bottom-0.5 right-0.5 p-0.5 rounded bg-black/60">
                    <Film className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`${base}/create`}
              className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
            >
              <Wand2 className="w-3 h-3" />
              Create post from media
            </Link>
            <Link
              href={`${base}/assets`}
              className="flex items-center gap-1.5 text-xs font-semibold text-white-40 hover:text-white-100 transition-colors"
            >
              <ImageIcon className="w-3 h-3" />
              Upload more
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-white-40">
            No media assets yet. Upload images or videos to enhance your posts.
          </p>
          <Link
            href={`${base}/assets`}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
          >
            <ImageIcon className="w-3 h-3" />
            Upload media
          </Link>
        </>
      )}
    </div>
  );
}

// ── System Freshness (NEW) ───────────────────────────────────────────────

function SystemFreshness({
  recommendations,
  base,
}: {
  recommendations: DashboardRecommendationsResponse | undefined;
  base: string;
}) {
  const summary = recommendations?.summary;
  const ap = summary?.autopilot;
  const re = summary?.realEstate;

  const signals: { label: string; status: 'fresh' | 'stale' | 'missing'; detail: string }[] = [];

  // Autopilot last run
  if (ap) {
    const lastRun = ap.lastActionAt ? new Date(ap.lastActionAt) : null;
    const hoursSince = lastRun ? (Date.now() - lastRun.getTime()) / 3600000 : null;
    if (ap.enabled && lastRun && hoursSince != null) {
      signals.push({
        label: 'Autopilot',
        status: hoursSince < 48 ? 'fresh' : 'stale',
        detail: `Last ran ${formatTimeAgo(lastRun)}`,
      });
    } else if (!ap.enabled) {
      signals.push({
        label: 'Autopilot',
        status: 'missing',
        detail: 'Not enabled',
      });
    }
  }

  // Listing feed
  if (re) {
    if (re.listingFeedConnected) {
      signals.push({
        label: 'Listings',
        status: re.listingCount > 0 ? 'fresh' : 'stale',
        detail: re.listingCount > 0 ? `${re.listingCount} imported` : 'Feed connected, no listings yet',
      });
    } else {
      signals.push({
        label: 'Listings',
        status: 'missing',
        detail: 'Feed not connected',
      });
    }
  }

  // Channels
  const channels = re?.availableChannels ?? [];
  if (summary?.enabledChannels != null) {
    signals.push({
      label: 'Channels',
      status: (summary.enabledChannels ?? 0) > 0 ? 'fresh' : 'missing',
      detail: (summary.enabledChannels ?? 0) > 0
        ? `${summary.enabledChannels} connected`
        : 'No channels connected',
    });
  }

  // Content freshness
  const daysSince = summary?.daysSinceLastGeneration;
  if (daysSince != null) {
    signals.push({
      label: 'Content',
      status: daysSince <= 3 ? 'fresh' : daysSince <= 7 ? 'stale' : 'missing',
      detail: daysSince === 0
        ? 'Generated today'
        : daysSince === 1
          ? 'Generated yesterday'
          : `${daysSince} days since last content`,
    });
  }

  if (signals.length === 0) return null;

  const statusIcon = (s: 'fresh' | 'stale' | 'missing') => {
    switch (s) {
      case 'fresh':
        return <div className="w-2 h-2 rounded-full bg-accent-green-110 flex-shrink-0" />;
      case 'stale':
        return <div className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />;
      case 'missing':
        return <div className="w-2 h-2 rounded-full bg-white-20 flex-shrink-0" />;
    }
  };

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-white-40" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          System Status
        </h3>
      </div>

      <div className="space-y-2">
        {signals.map((signal) => (
          <div key={signal.label} className="flex items-center gap-2">
            {statusIcon(signal.status)}
            <span className="text-xs text-white-60 w-16 flex-shrink-0">{signal.label}</span>
            <span className={`text-xs flex-1 ${
              signal.status === 'fresh'
                ? 'text-white-80'
                : signal.status === 'stale'
                  ? 'text-yellow-400'
                  : 'text-white-30'
            }`}>
              {signal.detail}
            </span>
            {signal.status === 'missing' && signal.label === 'Listings' && (
              <Link
                href={`${base}/settings/integrations`}
                className="text-[10px] text-accent-green-110 hover:underline flex-shrink-0"
              >
                Connect
              </Link>
            )}
            {signal.status === 'missing' && signal.label === 'Channels' && (
              <Link
                href={`${base}/settings/media`}
                className="text-[10px] text-accent-green-110 hover:underline flex-shrink-0"
              >
                Setup
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-white-20">
        {signals.every((s) => s.status === 'fresh')
          ? 'All systems running normally'
          : signals.some((s) => s.status === 'missing')
            ? 'Complete setup to get the most from Squadpitch'
            : 'Some systems may need attention'}
      </p>
    </div>
  );
}

// ── System Status (real estate) ──────────────────────────────────────────

function SystemStatus({
  summary,
  base,
}: {
  summary: DashboardRecommendationsResponse['summary'];
  base: string;
}) {
  const re = summary.realEstate;
  const ap = summary.autopilot;

  const signals: { label: string; value: string; accent?: boolean }[] = [];

  if (re) {
    if (re.listingCount > 0) {
      signals.push({
        label: 'Listings ready',
        value: `${re.listingCount} ready for content`,
        accent: true,
      });
    }
    if (re.availableChannels.length > 0) {
      signals.push({
        label: 'Channels',
        value: re.availableChannels.map((c) => c.charAt(0) + c.slice(1).toLowerCase()).join(', '),
      });
    }
  }

  if (ap) {
    signals.push({
      label: 'Autopilot',
      value: ap.enabled ? 'Active' : 'Off',
      accent: ap.enabled,
    });
    if (ap.draftsThisWeek > 0) {
      signals.push({
        label: 'This week',
        value: `${ap.draftsThisWeek} drafts created`,
      });
    }
  }

  if ((summary.unusedDataCount ?? 0) > 0) {
    signals.push({
      label: 'Opportunity',
      value: `${summary.unusedDataCount} unused opportunities`,
      accent: true,
    });
  }

  // Momentum messaging
  const published = summary.publishedThisWeek ?? 0;
  const daysSince = summary.daysSinceLastGeneration;
  let momentumText = '';
  let momentumTone: 'positive' | 'neutral' | 'warn' = 'neutral';

  if (published >= 3) {
    momentumText = `You posted ${published} times this week — on track for consistent posting`;
    momentumTone = 'positive';
  } else if (published > 0) {
    momentumText = `You posted ${published} time${published > 1 ? 's' : ''} this week — keep going to stay consistent`;
    momentumTone = 'neutral';
  } else if (daysSince != null && daysSince > 4) {
    momentumText = `No posts in ${daysSince} days — activity is low`;
    momentumTone = 'warn';
  } else if (daysSince != null && daysSince > 0) {
    momentumText = `Last content ${daysSince} day${daysSince > 1 ? 's' : ''} ago`;
    momentumTone = 'neutral';
  }

  if (signals.length === 0 && !momentumText) return null;

  const momentumColors = {
    positive: 'text-accent-green-110',
    neutral: 'text-white-40',
    warn: 'text-orange-400',
  };

  return (
    <div className="card p-5 bg-gradient-to-r from-accent-green-110/5 to-transparent border-accent-green-110/10">
      <div className="flex items-center gap-2 mb-3">
        <Home className="w-4 h-4 text-accent-green-110" />
        <h2 className="text-sm font-semibold text-white-100">Your Marketing System</h2>
      </div>
      {momentumText && (
        <p className={`text-xs font-medium mb-3 ${momentumColors[momentumTone]}`}>
          {momentumText}
        </p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {signals.slice(0, 4).map((s) => (
          <div key={s.label}>
            <p className="text-[10px] text-white-30 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className={`text-xs font-medium ${s.accent ? 'text-accent-green-110' : 'text-white-80'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
      {re && !re.listingFeedConnected && (
        <Link
          href={`${base}/settings/media`}
          className="inline-flex items-center gap-1 mt-3 text-[11px] text-accent-green-110 hover:underline"
        >
          Connect property listings to unlock more opportunities
          <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

// ── Recent Activity (real estate) ────────────────────────────────────────

function RecentActivity({
  drafts,
  recommendations,
}: {
  drafts: Draft[] | undefined;
  recommendations: DashboardRecommendationsResponse | undefined;
}) {
  const events: { icon: React.ReactNode; text: string; time: string }[] = [];

  const ap = recommendations?.summary?.autopilot;
  if (ap && ap.draftsThisWeek > 0) {
    events.push({
      icon: <Zap className="w-3.5 h-3.5 text-yellow-400" />,
      text: `Autopilot created ${ap.draftsThisWeek} draft${ap.draftsThisWeek > 1 ? 's' : ''} this week`,
      time: ap.lastActionAt ? formatTimeAgo(new Date(ap.lastActionAt)) : '',
    });
  }

  if (drafts) {
    const recentPublished = drafts.filter((d) => d.status === 'PUBLISHED');
    if (recentPublished.length > 0) {
      events.push({
        icon: <Send className="w-3.5 h-3.5 text-accent-green-110" />,
        text: `${recentPublished.length} post${recentPublished.length > 1 ? 's' : ''} published`,
        time: formatTimeAgo(new Date(recentPublished[0].createdAt)),
      });
    }

    const recentScheduled = drafts.filter((d) => d.status === 'SCHEDULED');
    if (recentScheduled.length > 0) {
      events.push({
        icon: <Calendar className="w-3.5 h-3.5 text-blue-400" />,
        text: `${recentScheduled.length} post${recentScheduled.length > 1 ? 's' : ''} scheduled`,
        time: formatTimeAgo(new Date(recentScheduled[0].createdAt)),
      });
    }

    const recentDrafts = drafts.filter((d) => d.status === 'DRAFT');
    if (recentDrafts.length > 0) {
      events.push({
        icon: <Wand2 className="w-3.5 h-3.5 text-purple-400" />,
        text: `${recentDrafts.length} draft${recentDrafts.length > 1 ? 's' : ''} generated`,
        time: formatTimeAgo(new Date(recentDrafts[0].createdAt)),
      });
    }
  }

  const re = recommendations?.summary?.realEstate;
  if (re && re.listingCount > 0) {
    events.push({
      icon: <Home className="w-3.5 h-3.5 text-accent-green-110" />,
      text: `${re.listingCount} listings imported from your feed`,
      time: '',
    });
  }

  if (events.length === 0) return null;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-white-40" />
        <h2 className="text-sm font-semibold text-white-100">Recent Activity</h2>
      </div>
      <div className="space-y-2">
        {events.slice(0, 5).map((ev, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="flex-shrink-0">{ev.icon}</div>
            <p className="text-xs text-white-80 flex-1">{ev.text}</p>
            {ev.time && (
              <span className="text-[10px] text-white-30 flex-shrink-0">{ev.time}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
