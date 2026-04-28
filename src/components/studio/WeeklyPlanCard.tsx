'use client';

import { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ArrowRight,
  Flame,
  Sparkles,
  Clock,
  CheckCircle2,
  Zap,
  Instagram,
  Linkedin,
  Facebook,
  Twitter,
} from 'lucide-react';
import { deriveWeeklyState, checkReturnStatus, recordVisit, updateStreak } from '@/lib/weeklyState';
import { trackActivationEvent } from '@/lib/activationTracking';
import { UpgradeTriggerBanner } from '@/components/billing/UpgradeTriggerBanner';
import type { Draft, Channel } from '@/hooks/useSquadpitch';

// ── Props ──────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  base: string;
  drafts: Draft[] | undefined;
  publishedThisWeek?: number;
  scheduledUpcoming?: number;
  autopilotEnabled?: boolean;
  currentTier?: string;
}

export function WeeklyPlanCard({
  clientId,
  base,
  drafts,
  publishedThisWeek,
  scheduledUpcoming,
  autopilotEnabled,
  currentTier,
}: Props) {
  const weekly = useMemo(
    () => deriveWeeklyState(drafts, { publishedThisWeek, scheduledUpcoming }),
    [drafts, publishedThisWeek, scheduledUpcoming],
  );

  const returnInfo = useMemo(() => checkReturnStatus(), []);
  const trackedRef = useRef(false);

  // ── Track events on mount ──────────────────────────────────────────
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    const payload = {
      clientId,
      postsThisWeekCount: weekly.postsReadyThisWeek,
      weeklyTarget: weekly.weeklyTarget,
      daysSinceLastVisit: returnInfo.daysSinceLastVisit,
    };

    trackActivationEvent('weekly_plan_viewed', payload, { once: true });

    if (weekly.postsReadyThisWeek === 0) {
      trackActivationEvent('weekly_empty_state_seen', payload, { once: true });
    }

    if (weekly.targetMet) {
      trackActivationEvent('weekly_target_met', payload, { once: true });
      updateStreak();
    }

    if (returnInfo.isReturning) {
      trackActivationEvent('weekly_return_after_inactivity', payload, { once: true });
    }

    recordVisit();
  }, [clientId, weekly, returnInfo]);

  const handleCtaClick = (cta: string) => {
    trackActivationEvent('weekly_cta_clicked', {
      clientId,
      postsThisWeekCount: weekly.postsReadyThisWeek,
      weeklyTarget: weekly.weeklyTarget,
      actionSource: cta,
    });
  };

  // ── Nudge color mapping ────────────────────────────────────────────
  const nudgeColor = {
    empty: 'text-orange-400',
    progress: 'text-yellow-400',
    schedule: 'text-blue-400',
    ontrack: 'text-accent-green-110',
    urgency: 'text-red-400',
  }[weekly.nudge.type];

  const progressColor =
    weekly.weeklyProgressPercent >= 100
      ? 'bg-accent-green-110'
      : weekly.weeklyProgressPercent >= 60
        ? 'bg-yellow-400'
        : 'bg-orange-400';

  return (
    <div className="card p-5 border-white-10 space-y-4">
      {/* Return banner */}
      {returnInfo.isReturning && !weekly.targetMet && (
        <div className="flex items-center justify-between px-4 py-2.5 -mx-5 -mt-5 mb-1 bg-accent-green-110/10 border-b border-accent-green-110/20">
          <span className="text-sm text-white-80">
            Ready to create this week&apos;s content?
          </span>
          <Link
            href={`${base}/create`}
            onClick={() => handleCtaClick('return_continue')}
            className="text-sm font-medium text-accent-green-110 hover:text-accent-green-120 transition-colors"
          >
            Continue
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-green-110" />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            This week&apos;s content plan
          </h2>
        </div>
        {weekly.streak >= 2 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-400/15 text-orange-400">
            <Flame className="w-3 h-3" />
            <span className="text-xs font-semibold">{weekly.streak} week streak</span>
          </div>
        )}
      </div>

      <p className="text-xs text-white-40">Stay consistent to grow your presence</p>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white-60">
            {weekly.postsReadyThisWeek} of {weekly.weeklyTarget} posts ready
          </span>
          {weekly.postsScheduledThisWeek > 0 && (
            <span className="text-white-40">
              {weekly.postsScheduledThisWeek} scheduled
            </span>
          )}
        </div>
        <div className="h-2 rounded-full bg-white-5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${weekly.weeklyProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Nudge */}
      <p className={`text-sm font-medium ${nudgeColor}`}>
        {weekly.nudge.message}
      </p>

      {/* Weekly drafts list */}
      {weekly.weeklyDrafts.length > 0 && (
        <div className="space-y-1.5">
          {weekly.weeklyDrafts.slice(0, 5).map((draft, i) => (
            <WeeklyDraftRow key={draft.id} draft={draft} index={i} />
          ))}
        </div>
      )}

      {/* Empty week state */}
      {weekly.postsReadyThisWeek === 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white-10">
          <div className="w-8 h-8 rounded-full bg-orange-400/15 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white-80">
              This week is empty — let&apos;s fix that
            </p>
            <p className="text-xs text-white-40 mt-0.5">
              Generate content to stay visible to your audience
            </p>
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="flex items-center gap-2">
        <Link
          href={`${base}/create`}
          onClick={() => handleCtaClick('create_next_post')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-green-110 text-sp-bg font-semibold text-sm hover:bg-accent-green-120 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Create next post
        </Link>
        <Link
          href={`${base}/planner`}
          onClick={() => handleCtaClick('view_planner')}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white-10 text-white-60 text-sm hover:bg-white-5 hover:text-white-100 transition-colors"
        >
          View planner
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Autopilot nudge */}
      {autopilotEnabled === false && weekly.postsReadyThisWeek > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-white-5">
          <span className="text-xs text-white-30">Want this done automatically?</span>
          <Link
            href={`${base}/autopilot`}
            onClick={() => handleCtaClick('autopilot')}
            className="flex items-center gap-1 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Turn on autopilot
          </Link>
        </div>
      )}

      {autopilotEnabled === true && (
        <div className="flex items-center gap-2 pt-2 border-t border-white-5">
          <Zap className="w-3 h-3 text-accent-green-110" />
          <span className="text-xs text-white-40">Autopilot is handling this week</span>
        </div>
      )}

      {/* Free tier upgrade nudge — Trigger B */}
      {currentTier === 'FREE' && (
        <UpgradeTriggerBanner
          triggerSource="weekly_plan"
          headline="Free includes 5 posts/month. Pro gives you enough to stay consistent every week."
          subtext="Upgrade to unlock 150 posts/mo, Autopilot, and multi-platform posting."
          cta="Upgrade to Pro"
          targetTier="PRO"
          clientId={clientId}
        />
      )}

      {/* Urgency — days remaining */}
      {weekly.daysRemaining <= 2 && !weekly.targetMet && (
        <div className="flex items-center gap-2 pt-1">
          <Clock className="w-3 h-3 text-red-400" />
          <span className="text-xs text-red-400">
            {weekly.daysRemaining} day{weekly.daysRemaining === 1 ? '' : 's'} left this week
          </span>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function WeeklyDraftRow({ draft, index }: { draft: Draft; index: number }) {
  const statusIcon =
    draft.status === 'PUBLISHED' ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-accent-green-110" />
    ) : draft.status === 'SCHEDULED' ? (
      <Clock className="w-3.5 h-3.5 text-blue-400" />
    ) : null;

  const channelIcons: Partial<Record<Channel, React.ReactNode>> = {
    INSTAGRAM: <Instagram className="w-3 h-3" />,
    LINKEDIN: <Linkedin className="w-3 h-3" />,
    FACEBOOK: <Facebook className="w-3 h-3" />,
    X: <Twitter className="w-3 h-3" />,
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
      <span className="text-xs text-white-20 w-5 text-center font-mono">
        {index + 1}
      </span>
      <div className="flex items-center gap-1.5 text-white-40">
        {channelIcons[draft.channel] ?? (
          <span className="text-[9px] font-bold">{draft.channel[0]}</span>
        )}
      </div>
      <span className="text-sm text-white-60 truncate flex-1">
        {draft.body.slice(0, 60)}{draft.body.length > 60 ? '...' : ''}
      </span>
      {statusIcon}
    </div>
  );
}
