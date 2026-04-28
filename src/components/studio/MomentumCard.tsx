'use client';

import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  Sparkles,
  Calendar,
  Radio,
  LinkIcon,
  FileText,
} from 'lucide-react';
import type { ActivationState } from '@/lib/activationState';

// ── Types ────────────────────────────────────────────────────────────────

interface Props {
  activation: ActivationState;
  connectedChannelCount: number;
  base: string;
}

// ── Component ────────────────────────────────────────────────────────────

export function MomentumCard({
  activation,
  connectedChannelCount,
  base,
}: Props) {
  const {
    postsCreatedCount,
    postsScheduledCount,
    publishedThisWeek,
    scheduledUpcoming,
    hasConnectedChannels,
  } = activation;

  // ── Dynamic next-action recommendation ───────────────────────────────
  const nextAction = getNextAction({
    hasConnectedChannels,
    scheduledUpcoming,
    postsCreatedCount,
    publishedThisWeek,
    base,
  });

  // Weekly plan
  const weeklyTotal = publishedThisWeek + scheduledUpcoming;
  const showWeeklyNudge = weeklyTotal < 3;

  return (
    <div className="space-y-4">
      {/* ── Main momentum card ───────────────────────────────── */}
      <div className="rounded-2xl border border-white-10 bg-sp-card overflow-hidden">
        <div className="px-5 py-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-accent-green-110/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-accent-green-110" />
            </div>
            <h2 className="text-lg font-bold text-white">
              You&apos;re building momentum
            </h2>
          </div>
          <p className="text-sm text-white-40 ml-[42px] mb-5">
            Stay consistent to grow your presence.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 ml-[42px] mb-5">
            <Stat
              icon={<FileText className="w-3.5 h-3.5" />}
              value={publishedThisWeek}
              label="Posted this week"
              accent="text-accent-green-110"
            />
            <Stat
              icon={<Calendar className="w-3.5 h-3.5" />}
              value={scheduledUpcoming}
              label="Scheduled"
              accent="text-blue-400"
            />
            <Stat
              icon={<Radio className="w-3.5 h-3.5" />}
              value={connectedChannelCount}
              label={connectedChannelCount === 1 ? 'Channel' : 'Channels'}
              accent={hasConnectedChannels ? 'text-purple-400' : 'text-white-30'}
            />
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ml-[42px]">
            <Link
              href={`${base}/create`}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Create next post
            </Link>
            <Link
              href={`${base}/planner`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white-10 text-white-70 font-medium text-sm hover:bg-white-5 hover:text-white transition-colors"
            >
              View content planner
            </Link>
          </div>
        </div>

        {/* ── Next action recommendation ─────────────────────── */}
        {nextAction && (
          <Link
            href={nextAction.href}
            className="flex items-center gap-3 px-5 py-3 border-t border-white-10 hover:bg-white-5 transition-colors group"
          >
            <span className={nextAction.accent}>{nextAction.icon}</span>
            <span className="flex-1 text-sm text-white-60 group-hover:text-white-80 transition-colors">
              {nextAction.label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-white-20 group-hover:text-white-40 transition-colors" />
          </Link>
        )}
      </div>

      {/* ── Weekly plan nudge ────────────────────────────────── */}
      {showWeeklyNudge && (
        <div className="rounded-xl border border-white-10 bg-sp-card px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-white-80">
              You have <span className="font-semibold text-white">{weeklyTotal} post{weeklyTotal !== 1 ? 's' : ''}</span> planned this week.
            </p>
            <p className="text-xs text-white-30 mt-0.5">
              Most creators post 3–5 times per week.
            </p>
          </div>
          <Link
            href={`${base}/create`}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white-10 text-xs text-white-60 font-medium hover:bg-white-5 hover:text-white transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Generate more
          </Link>
        </div>
      )}

      {/* Autopilot upsell is handled by AutopilotUpsellCard on the dashboard */}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function Stat({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={accent}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white-100 leading-none">{value}</p>
        <p className="text-[10px] text-white-40 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

// ── Next-action logic ────────────────────────────────────────────────────

function getNextAction(ctx: {
  hasConnectedChannels: boolean;
  scheduledUpcoming: number;
  postsCreatedCount: number;
  publishedThisWeek: number;
  base: string;
}): { icon: React.ReactNode; label: string; href: string; accent: string } | null {
  if (!ctx.hasConnectedChannels) {
    return {
      icon: <LinkIcon className="w-4 h-4" />,
      label: 'Connect a channel to start publishing',
      href: `${ctx.base}/settings/channels`,
      accent: 'text-blue-400',
    };
  }

  if (ctx.scheduledUpcoming === 0) {
    return {
      icon: <Calendar className="w-4 h-4" />,
      label: 'Schedule your next post',
      href: `${ctx.base}/planner`,
      accent: 'text-orange-400',
    };
  }

  if (ctx.postsCreatedCount <= 3) {
    return {
      icon: <Sparkles className="w-4 h-4" />,
      label: 'Create 2 more posts to stay consistent',
      href: `${ctx.base}/create`,
      accent: 'text-purple-400',
    };
  }

  if (ctx.publishedThisWeek < 5) {
    return {
      icon: <FileText className="w-4 h-4" />,
      label: "Review this week\u2019s content",
      href: `${ctx.base}/planner`,
      accent: 'text-accent-green-110',
    };
  }

  return null;
}
