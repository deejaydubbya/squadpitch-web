'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Lock,
  ArrowRight,
  Eye,
  LinkIcon,
  Send,
  Calendar,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackActivationEvent } from '@/lib/activationTracking';
import type { ActivationState } from '@/lib/activationState';

// ── Types ──────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  base: string;
  activation: ActivationState;
  hasWeeklyPlan: boolean;
  autopilotEnabled: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  state: 'completed' | 'current' | 'locked';
  cta: string;
  href: string;
  icon: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────

export function PostOnboardingChecklist({
  clientId,
  base,
  activation,
  hasWeeklyPlan,
  autopilotEnabled,
}: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackActivationEvent('dashboard_checklist_viewed', { clientId }, { once: true });
  }, [clientId]);

  // ── Build checklist items ────────────────────────────────────────────
  const firstPostReviewed = activation.postsApprovedCount > 0 || activation.postsScheduledCount > 0 || activation.postsPublishedCount > 0;
  const channelConnected = activation.hasConnectedChannels;
  const firstPostActioned = activation.postsScheduledCount > 0 || activation.postsPublishedCount > 0;

  const items: ChecklistItem[] = [
    {
      id: 'review',
      label: 'Review your posts',
      state: firstPostReviewed ? 'completed' : 'current',
      cta: 'Continue reviewing',
      href: `${base}/getting-started`,
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: 'connect',
      label: 'Connect a channel to publish',
      state: channelConnected
        ? 'completed'
        : firstPostReviewed
          ? 'current'
          : 'locked',
      cta: 'Connect channel',
      href: `${base}/settings/channels`,
      icon: <LinkIcon className="w-4 h-4" />,
    },
    {
      id: 'publish',
      label: 'Schedule your posts for this week',
      state: firstPostActioned
        ? 'completed'
        : firstPostReviewed
          ? 'current'
          : 'locked',
      cta: 'Schedule posts',
      href: `${base}/planner`,
      icon: <Send className="w-4 h-4" />,
    },
    {
      id: 'weekly',
      label: 'Create your next post',
      state: hasWeeklyPlan
        ? 'completed'
        : firstPostActioned
          ? 'current'
          : 'locked',
      cta: 'Create post',
      href: `${base}/create`,
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      id: 'autopilot',
      label: 'Turn on autopilot',
      state: autopilotEnabled
        ? 'completed'
        : hasWeeklyPlan || firstPostActioned
          ? 'current'
          : 'locked',
      cta: 'Enable autopilot',
      href: `${base}/autopilot`,
      icon: <Zap className="w-4 h-4" />,
    },
  ];

  const completedCount = items.filter((i) => i.state === 'completed').length;
  const allDone = completedCount === items.length;

  // Don't render if everything is done
  if (allDone) return null;

  const currentItem = items.find((i) => i.state === 'current');
  const progressPct = Math.round((completedCount / items.length) * 100);

  const handleCtaClick = (itemId: string) => {
    trackActivationEvent('checklist_item_clicked', {
      clientId,
      actionSource: itemId,
    });
    trackActivationEvent('dashboard_checklist_cta_clicked', {
      clientId,
      actionSource: itemId,
    });
  };

  return (
    <div className="card p-8 md:p-10 border-accent-green-110/20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white-100">
            Finish setting up Squadpitch
          </h2>
          <p className="text-sm text-white-40 mt-1">
            {completedCount} of {items.length} steps complete
          </p>
        </div>
        <span className="text-base font-bold text-accent-green-110">
          {progressPct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white-5 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-green-110 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
              item.state === 'current' && 'bg-white-5 border border-white-10',
            )}
          >
            {/* Status icon */}
            {item.state === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-accent-green-110 flex-shrink-0" />
            ) : item.state === 'locked' ? (
              <Lock className="w-4 h-4 text-white-20 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-white-30 flex-shrink-0" />
            )}

            {/* Icon */}
            <span className={cn(
              'flex-shrink-0',
              item.state === 'completed' && 'text-white-30',
              item.state === 'current' && 'text-white-60',
              item.state === 'locked' && 'text-white-15',
            )}>
              {item.icon}
            </span>

            {/* Label */}
            <span
              className={cn(
                'text-sm flex-1',
                item.state === 'completed' && 'text-white-40 line-through',
                item.state === 'current' && 'text-white-100 font-medium',
                item.state === 'locked' && 'text-white-20',
              )}
            >
              {item.label}
            </span>

            {/* CTA button — visible on every item */}
            {item.state === 'current' ? (
              <Link
                href={item.href}
                onClick={() => handleCtaClick(item.id)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-green-110 text-sp-bg text-xs font-semibold hover:bg-accent-green-120 transition-colors flex-shrink-0"
              >
                {item.cta}
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : item.state === 'locked' ? (
              <span className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white-5 text-white-20 text-xs font-medium flex-shrink-0 cursor-not-allowed">
                {item.cta}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
