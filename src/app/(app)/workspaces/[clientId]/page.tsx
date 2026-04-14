'use client';

import { useState } from 'react';
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
  Trophy,
  TrendingUp,
  FileText,
  ChevronRight,
  Zap,
  Target,
  Film,
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
  useApproveDraft,
  usePublishDraft,
  useScheduleDraft,
  useDuplicateDraft,
  useBusinessDataLabels,
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
  const generate = useGenerateContent();
  const duplicate = useDuplicateDraft();

  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState(false);

  if (!client) return null;
  const base = `/workspaces/${clientId}`;

  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];

  const quickLinks = [
    { href: `${base}/create`, icon: Wand2, label: 'Create Content', desc: 'Generate on-brand posts' },
    { href: `${base}/planner`, icon: Calendar, label: 'Planner', desc: 'Calendar & queue' },
    { href: `${base}/library`, icon: Library, label: 'Content Library', desc: 'All your drafts' },
    { href: `${base}/assets`, icon: ImageIcon, label: 'Media Library', desc: 'Images & videos' },
    { href: `${base}/analytics`, icon: BarChart3, label: 'Analytics', desc: 'Performance metrics' },
    { href: `${base}/settings/brand`, icon: Settings, label: 'Settings', desc: 'Brand, voice & channels' },
  ];

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
      default:
        router.push(`${base}/create`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
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

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total drafts" value={analytics?.total ?? 0} />
        <StatCard
          label="Approved"
          value={
            (analytics?.byStatus?.APPROVED ?? 0) +
            (analytics?.byStatus?.PUBLISHED ?? 0) +
            (analytics?.byStatus?.SCHEDULED ?? 0)
          }
        />
        <StatCard label="Pending" value={analytics?.byStatus?.PENDING_REVIEW ?? 0} />
        <StatCard
          label="Approval rate"
          value={`${Math.round((analytics?.approvalRate ?? 0) * 100)}%`}
        />
      </div>

      {/* AI Recommendations — replaces Quick Start */}
      <div className="card p-6 bg-gradient-to-r from-accent-green-110/10 to-transparent border-accent-green-110/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent-green-110" />
          <h2 className="text-lg font-bold text-white-100">AI Recommendations</h2>
        </div>

        {recommendations && recommendations.recommendations.length > 0 ? (
          <div className="space-y-2 mb-4">
            {recommendations.recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                rec={rec}
                onAction={() => handleRecommendationAction(rec)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-white-40 mb-4">
            Looking good! Keep publishing to unlock more insights.
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleGenerateSuggested}
            disabled={isGenerating || enabledChannels.length === 0}
            className="px-5 py-3 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm flex items-center gap-2 hover:bg-accent-green-120 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Suggested Content
              </>
            )}
          </button>
          {enabledChannels.length === 0 && (
            <p className="text-xs text-white-30">
              Enable at least one channel in{' '}
              <Link href={`${base}/settings/media`} className="text-accent-green-110 hover:underline">
                Settings
              </Link>{' '}
              first.
            </p>
          )}
        </div>
        {genSuccess && (
          <p className="text-xs text-accent-green-110 mt-2">
            Content generated! View in your{' '}
            <Link href={`${base}/library`} className="underline">Content Library</Link>.
          </p>
        )}
        {genError && <StatusBanner error={genError} />}
      </div>

      {/* Next Best Actions */}
      {actionsData && actionsData.actions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
            What to do next
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

      {/* Performance Snapshot + Content Pipeline + Business Data Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <PerformanceSnapshot overview={overview} base={base} />
        <ContentPipeline analytics={analytics} base={base} />
        <BusinessDataSnapshot recommendations={recommendations} base={base} clientId={clientId} />
      </div>

      {/* Media Preview + Consistency Tracker + Autopilot Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MediaPreview assets={recentAssets} base={base} />
        <ConsistencyTracker recommendations={recommendations} />
        <AutopilotStatus recommendations={recommendations} base={base} clientId={clientId} />
      </div>

      {/* Tech Stack */}
      <TechStackSection clientId={clientId} />

      {/* Workspace links */}
      <div>
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
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

      {/* Recent drafts — improved with actions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Recent drafts
          </h2>
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
            No drafts yet. Head to{' '}
            <Link
              href={`${base}/create`}
              className="text-accent-green-110 hover:underline"
            >
              Create Content
            </Link>{' '}
            to make one.
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

// ── Sub-components ────────────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-white-40 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white-100 mt-1">{value}</p>
    </div>
  );
}

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
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white-5 border border-white-10">
      <div className="flex-shrink-0">
        {iconMap[rec.category] ?? <Sparkles className="w-4 h-4 text-white-40" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white-100">{rec.title}</p>
        <p className="text-xs text-white-40">{rec.reason ?? rec.description}</p>
      </div>
      <button
        onClick={onAction}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-white-10 text-white-60 text-xs font-medium hover:bg-white-20 transition-colors"
      >
        {rec.actionLabel}
      </button>
    </div>
  );
}

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

// ── Phase 2 Components ─────────────────────────────────────────────────

function PerformanceSnapshot({
  overview,
  base,
}: {
  overview: ReturnType<typeof useAnalyticsOverview>['data'];
  base: string;
}) {
  const topPost = overview?.topPosts?.[0];

  return (
    <Link href={`${base}/analytics`} className="card-hover p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          Performance
        </h3>
        <ChevronRight className="w-3 h-3 text-white-30 ml-auto" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white-40">Top platform</span>
          <span className="text-xs font-medium text-white-100">
            {overview?.kpis?.topPlatform ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white-40">Best content type</span>
          <span className="text-xs font-medium text-white-100">
            {overview?.kpis?.bestContentType ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white-40">Top post</span>
          <span className="text-xs font-medium text-white-100 truncate ml-2 max-w-[120px]">
            {topPost
              ? `${Math.round(topPost.performanceScore ?? 0)}pts`
              : '—'}
          </span>
        </div>
      </div>

      {topPost && (
        <p className="text-[11px] text-white-30 line-clamp-1 italic">
          {topPost.body?.slice(0, 60)}...
        </p>
      )}
    </Link>
  );
}

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

function BusinessDataSnapshot({
  recommendations,
  base,
  clientId,
}: {
  recommendations: ReturnType<typeof useDashboardRecommendations>['data'];
  base: string;
  clientId: string;
}) {
  const bdLabels = useBusinessDataLabels(clientId);
  const summary = recommendations?.summary;
  const dataByType = summary?.dataByType ?? {};
  const entries = Object.entries(dataByType).filter(([, count]) => (count ?? 0) > 0);

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-purple-400" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          Business Data
        </h3>
      </div>

      {entries.length > 0 ? (
        <>
          <div className="space-y-1.5">
            {entries.slice(0, 5).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs text-white-40">
                  {DATA_TYPE_LABELS[type] ?? type}
                </span>
                <span className="text-xs font-semibold text-white-100">{count}</span>
              </div>
            ))}
            {entries.length > 5 && (
              <p className="text-[11px] text-white-30">
                +{entries.length - 5} more type{entries.length - 5 > 1 ? 's' : ''}
              </p>
            )}
          </div>

          {(summary?.unusedDataCount ?? 0) > 0 && (
            <p className="text-[11px] text-yellow-400">
              {summary!.unusedDataCount} unused {summary!.unusedDataCount === 1 ? bdLabels.itemSingular.toLowerCase() : bdLabels.itemPlural.toLowerCase()}
            </p>
          )}

          <Link
            href={`${base}/business-data`}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
          >
            <Wand2 className="w-3 h-3" />
            Generate content from {bdLabels.itemPlural.toLowerCase()}
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs text-white-40">
            No data yet. Add testimonials, stats, or {bdLabels.itemPlural.toLowerCase()}.
          </p>
          <Link
            href={`${base}/business-data`}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
          >
            <FileText className="w-3 h-3" />
            Add your first {bdLabels.itemSingular.toLowerCase()}
          </Link>
        </>
      )}
    </div>
  );
}

// ── Phase 3 Components ─────────────────────────────────────────────────

function MediaPreview({
  assets,
  base,
}: {
  assets: MediaAsset[] | undefined;
  base: string;
}) {
  const recent = assets?.slice(0, 4) ?? [];

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

          <Link
            href={`${base}/create`}
            className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
          >
            <Wand2 className="w-3 h-3" />
            Create post from media
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs text-white-40">No media assets yet.</p>
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

function AutopilotStatus({
  recommendations,
  base,
  clientId,
}: {
  recommendations: DashboardRecommendationsResponse | undefined;
  base: string;
  clientId: string;
}) {
  const bdLabels = useBusinessDataLabels(clientId);
  const summary = recommendations?.summary;
  const lastUsed = summary?.lastAutopilotAt;
  const hasData = (summary?.totalDataItems ?? 0) > 0;

  const lastUsedLabel = lastUsed
    ? formatTimeAgo(new Date(lastUsed))
    : 'Never used';

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-yellow-400" />
        <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
          Autopilot
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white-40">Status</span>
          <span className="text-xs font-medium text-white-100">On-demand</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white-40">Last run</span>
          <span className="text-xs font-medium text-white-100">{lastUsedLabel}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-white-40">{bdLabels.itemPlural}</span>
          <span className="text-xs font-medium text-white-100">
            {summary?.totalDataItems ?? 0}
          </span>
        </div>
      </div>

      {hasData ? (
        <Link
          href={`${base}/business-data`}
          className="flex items-center gap-1.5 text-xs font-semibold text-accent-green-110 hover:underline"
        >
          <Zap className="w-3 h-3" />
          Run Autopilot
        </Link>
      ) : (
        <p className="text-[11px] text-white-30">
          Add {bdLabels.itemPlural.toLowerCase()} to enable Autopilot.
        </p>
      )}
    </div>
  );
}

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
