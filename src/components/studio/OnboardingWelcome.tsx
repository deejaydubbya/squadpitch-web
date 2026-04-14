'use client';

import Link from 'next/link';
import {
  X,
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
  const { data: channels } = useChannelSettings(clientId);
  const { data: recommendations } = useDashboardRecommendations(clientId);

  const base = `/workspaces/${clientId}`;
  const enabledChannels = channels?.filter((c) => c.isEnabled) ?? [];

  const postsReady =
    (analytics?.byStatus?.DRAFT ?? 0) + (analytics?.byStatus?.APPROVED ?? 0);

  const totalDataItems = recommendations?.summary?.totalDataItems ?? 0;
  const hasChannels = enabledChannels.length > 0;

  // AI Strategy
  const voice = client?.voiceProfile;
  const brand = client?.brandProfile;
  const goalText =
    (voice?.ctaPreferences as Record<string, string> | null)?.goal ??
    brand?.audience ??
    null;
  const recommendedPlatform = enabledChannels[0]?.channel ?? null;
  const bucketNames = voice?.contentBuckets?.slice(0, 3).map((b) => b.label) ?? [];
  const contentApproach = [voice?.tone, ...bucketNames].filter(Boolean).join(', ') || null;
  const hasStrategy = goalText || recommendedPlatform || contentApproach;

  return (
    <div className="rounded-2xl border border-accent-green-110/30 bg-sp-card overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="relative px-6 pt-8 pb-6">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white-60 hover:text-white hover:bg-white-10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full bg-accent-green-110/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-accent-green-110" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            Your content is ready
          </h2>
        </div>

        <p className="text-sm text-white-70 ml-[42px]">
          {postsReady > 0
            ? `We created ${postsReady} post${postsReady !== 1 ? 's' : ''} for ${client?.name ?? 'your business'}.`
            : `Everything is set up for ${client?.name ?? 'your business'}.`}
        </p>

        {/* ── Primary CTAs ──────────────────────────────────── */}
        <div className="flex items-center gap-3 mt-6 ml-[42px]">
          <Link
            href={`${base}/library`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Review & Approve Posts
          </Link>
          <Link
            href={`${base}/planner`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white-10 text-white-80 font-medium text-sm hover:bg-white-15 hover:text-white transition-colors"
          >
            Schedule Posts
          </Link>
        </div>
      </div>

      {/* ── Supporting info ──────────────────────────────────── */}
      <div className="px-6 pb-6 pt-2 border-t border-white-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {/* AI Strategy */}
          {hasStrategy && (
            <div className="rounded-xl bg-white-5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-accent-green-110" />
                <span className="text-[11px] font-semibold text-white-60 uppercase tracking-wider">
                  AI Strategy
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 items-baseline">
                {goalText && (
                  <>
                    <span className="text-[11px] text-white-40">Goal</span>
                    <span className="text-[11px] text-white-80">{goalText}</span>
                  </>
                )}
                {recommendedPlatform && (
                  <>
                    <span className="text-[11px] text-white-40">Platform</span>
                    <span className="text-[11px] text-white-80 flex items-center gap-1">
                      <Globe className="w-2.5 h-2.5" />
                      {recommendedPlatform}
                    </span>
                  </>
                )}
                {contentApproach && (
                  <>
                    <span className="text-[11px] text-white-40">Approach</span>
                    <span className="text-[11px] text-white-80">{contentApproach}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="rounded-xl bg-white-5 p-4 space-y-2.5">
            <span className="text-[11px] font-semibold text-white-60 uppercase tracking-wider">
              Next Steps
            </span>
            {!hasChannels && (
              <Link
                href={`${base}/settings/channels`}
                className="flex items-center gap-2.5 group"
              >
                <LinkIcon className="w-3.5 h-3.5 text-accent-green-110 flex-shrink-0" />
                <span className="text-xs text-white-70 group-hover:text-white transition-colors">
                  Connect your social accounts to publish directly
                </span>
                <ArrowRight className="w-3 h-3 text-white-30 ml-auto flex-shrink-0" />
              </Link>
            )}
            {totalDataItems < 3 && (
              <Link
                href={`${base}/business-data`}
                className="flex items-center gap-2.5 group"
              >
                <Database className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                <span className="text-xs text-white-70 group-hover:text-white transition-colors">
                  Add testimonials & data for better content
                </span>
                <ArrowRight className="w-3 h-3 text-white-30 ml-auto flex-shrink-0" />
              </Link>
            )}
            {hasChannels && totalDataItems >= 3 && (
              <p className="text-xs text-white-60">
                You&apos;re all set. Review your posts and start publishing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
