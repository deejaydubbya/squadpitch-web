'use client';

import Link from 'next/link';
import {
  X,
  FileText,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  LinkIcon,
  Database,
  Sparkles,
  Globe,
  MessageSquare,
} from 'lucide-react';
import {
  useClientAnalytics,
  useDrafts,
  useChannelSettings,
  useClient,
  useDashboardRecommendations,
} from '@/hooks/useSquadpitch';

interface OnboardingWelcomeProps {
  clientId: string;
  onDismiss: () => void;
}

export function OnboardingWelcome({ clientId, onDismiss }: OnboardingWelcomeProps) {
  const { data: client } = useClient(clientId);
  const { data: analytics } = useClientAnalytics(clientId);
  const { data: scheduledDrafts } = useDrafts({ clientId, status: 'SCHEDULED', limit: 1 });
  const { data: channels } = useChannelSettings(clientId);
  const { data: recommendations } = useDashboardRecommendations(clientId);

  const base = `/clients/${clientId}`;
  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];

  // Stats
  const postsReady =
    (analytics?.byStatus?.DRAFT ?? 0) + (analytics?.byStatus?.APPROVED ?? 0);
  const postsScheduled = analytics?.byStatus?.SCHEDULED ?? 0;

  const nextScheduled = scheduledDrafts?.[0]?.scheduledFor;
  const nextPostLabel = nextScheduled
    ? new Date(nextScheduled).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'None yet';

  // Next actions
  const totalDataItems = recommendations?.summary?.totalDataItems ?? 0;
  const hasDrafts = postsReady > 0;
  const hasChannels = enabledChannels.length > 0;
  const hasData = totalDataItems >= 3;

  const actions: { icon: typeof FileText; title: string; desc: string; href: string }[] = [];
  if (hasDrafts) {
    actions.push({
      icon: CheckCircle2,
      title: 'Review & Approve Posts',
      desc: `You have ${postsReady} post${postsReady !== 1 ? 's' : ''} ready to review`,
      href: `${base}/library`,
    });
  }
  if (!hasChannels) {
    actions.push({
      icon: LinkIcon,
      title: 'Connect Platforms',
      desc: 'Link your social accounts to publish directly',
      href: `${base}/settings/channels`,
    });
  }
  if (!hasData) {
    actions.push({
      icon: Database,
      title: 'Add Business Data',
      desc: 'Testimonials, stats & case studies fuel better content',
      href: `${base}/business-data`,
    });
  }

  // Data Opportunities
  const unusedDataCount = recommendations?.summary?.unusedDataCount ?? 0;
  const allDataUsed = totalDataItems > 0 && unusedDataCount === 0;

  // AI Strategy
  const voice = client?.voiceProfile;
  const brand = client?.brandProfile;
  const goalText =
    (voice?.ctaPreferences as Record<string, string> | null)?.goal ??
    brand?.audience ??
    null;
  const recommendedPlatform =
    enabledChannels[0]?.channel ?? null;
  const bucketNames = voice?.contentBuckets?.slice(0, 3).map((b) => b.label) ?? [];
  const contentApproach = [voice?.tone, ...bucketNames].filter(Boolean).join(', ') || null;

  return (
    <div className="card p-0 overflow-hidden border-accent-green-110/20">
      {/* Hero header */}
      <div className="relative bg-gradient-to-r from-accent-green-110/10 to-transparent px-6 py-6">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white-60 hover:text-white-100 hover:bg-white-10 transition-colors"
          aria-label="Dismiss welcome"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-accent-green-110" />
          <h2 className="text-xl font-bold text-white-100">
            Your marketing system is ready
          </h2>
        </div>
        {client && (
          <p className="text-sm text-white-60">
            Everything is set up for {client.name}. Here&apos;s where you stand.
          </p>
        )}
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 -mt-1">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-white-100">{postsReady}</p>
            <p className="text-xs text-white-60 mt-0.5">Posts Ready</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-white-100">{postsScheduled}</p>
            <p className="text-xs text-white-60 mt-0.5">Scheduled</p>
          </div>
          <div className="card p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 text-white-60" />
              <p className="text-sm font-bold text-white-100 truncate">{nextPostLabel}</p>
            </div>
            <p className="text-xs text-white-60 mt-0.5">Next Post</p>
          </div>
        </div>

        {/* Next Actions */}
        {actions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-white-60 uppercase tracking-wider mb-2">
              Next Steps
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="card-hover p-4 flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-accent-green-110/20 flex items-center justify-center flex-shrink-0">
                    <a.icon className="w-4 h-4 text-accent-green-110" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white-100">{a.title}</p>
                    <p className="text-xs text-white-60 line-clamp-1">{a.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white-30 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Data Opportunities */}
        {!allDataUsed && (
          <div className="rounded-xl border border-white-15 bg-[#1a1f2e] p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
                Data Opportunities
              </h3>
            </div>
            {totalDataItems > 0 && unusedDataCount > 0 ? (
              <p className="text-sm text-white-60">
                You have {unusedDataCount} unused data item{unusedDataCount !== 1 ? 's' : ''} that
                can fuel new content.
              </p>
            ) : (
              <p className="text-sm text-white-60">
                Add testimonials, stats & case studies to fuel AI content generation.
              </p>
            )}
            <Link
              href={`${base}/business-data`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-green-110 hover:text-accent-green-120 transition-colors"
            >
              {totalDataItems > 0 ? 'Generate content from data' : 'Add business data'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* AI Strategy card */}
        {(goalText || recommendedPlatform || contentApproach) && (
          <div className="rounded-xl border border-white-15 bg-[#1a1f2e] p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-accent-green-110" />
              <h3 className="text-xs font-semibold text-white-100 uppercase tracking-wider">
                AI Strategy
              </h3>
            </div>
            {goalText && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-white-60 flex-shrink-0 pt-0.5">Goal</span>
                <span className="text-xs font-medium text-white-100 text-right">
                  {goalText}
                </span>
              </div>
            )}
            {recommendedPlatform && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-white-60 flex-shrink-0">Lead platform</span>
                <span className="text-xs font-medium text-white-100 flex items-center gap-1 ml-auto">
                  <Globe className="w-3 h-3" />
                  {recommendedPlatform}
                </span>
              </div>
            )}
            {contentApproach && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-white-60 flex-shrink-0 pt-0.5">Content approach</span>
                <span className="text-xs font-medium text-white-100 text-right">
                  {contentApproach}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
