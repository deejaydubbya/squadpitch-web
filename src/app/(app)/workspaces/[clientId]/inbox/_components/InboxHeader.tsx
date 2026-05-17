'use client';

// Top-of-page header for the Inbox. Title + subtitle on the left,
// four stat pills on the right (Unread / Open / Spam / Total).
// On screens narrower than md the pills wrap below the title.

import { Inbox as InboxIcon } from 'lucide-react';
import { useInboxStats, type InboxStats } from '@/hooks/useInbox';
import { cn } from '@/lib/utils';

interface InboxHeaderProps {
  clientId: string;
}

export function InboxHeader({ clientId }: InboxHeaderProps) {
  const { data: stats } = useInboxStats(clientId);

  return (
    <header className="px-4 sm:px-6 pt-4 pb-3 border-b border-white-10 bg-sp-bg">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-accent-green-110/15 text-accent-green-110 flex items-center justify-center shrink-0">
            <InboxIcon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white-100 leading-tight">Inbox</h1>
            <p className="text-xs text-white-50 mt-0.5 leading-snug">
              Manage leads from your landing pages, forms, and future message
              channels.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatPill
            label="Unread"
            value={stats?.unreadCount}
            tone={stats && stats.unreadCount > 0 ? 'accent' : 'muted'}
            primary
          />
          <StatPill label="Open" value={stats?.openCount} tone="default" />
          <StatPill
            label="Spam"
            value={stats?.spamCount}
            tone={stats && stats.spamCount > 0 ? 'warn' : 'muted'}
            hideOnSmall
          />
          <StatPill
            label="Total"
            value={stats?.totalCount}
            tone="muted"
            hideOnSmall
          />
        </div>
      </div>

      {/* Compact analytics bar — windowed metrics from the server.
          Hidden on small screens to keep the header scannable; the
          dashboard widget on workspaces/[clientId] surfaces a
          subset for the main overview. */}
      {stats && <AnalyticsBar stats={stats} />}
    </header>
  );
}

// One-row analytics strip. No charts, no library — just labeled
// numbers separated by · so the eye can scan left to right.
function AnalyticsBar({ stats }: { stats: InboxStats }) {
  const acceptRate =
    stats.aiSuggestionsGenerated > 0
      ? Math.round(
          (stats.aiSuggestionsUsed / stats.aiSuggestionsGenerated) * 100,
        )
      : null;
  const respLabel = formatResponseTime(stats.avgFirstResponseSeconds);
  const sourceTop = topSource(stats.bySource);

  return (
    <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-white-50">
      <span>
        Last {stats.windowDays}d:
      </span>
      <AnalyticsMetric label="Avg first response" value={respLabel} />
      <AnalyticsMetric
        label="Logged"
        value={String(stats.messageCounts.loggedExternal)}
      />
      <AnalyticsMetric
        label="Email sent"
        value={String(stats.messageCounts.emailSent)}
      />
      <AnalyticsMetric
        label="Social replies"
        value={String(stats.messageCounts.socialReplySent)}
      />
      <AnalyticsMetric
        label="Notes"
        value={String(stats.messageCounts.internalNotes)}
      />
      <AnalyticsMetric
        label="AI used"
        value={
          acceptRate == null
            ? '—'
            : `${stats.aiSuggestionsUsed}/${stats.aiSuggestionsGenerated} (${acceptRate}%)`
        }
      />
      {sourceTop && (
        <AnalyticsMetric label="Top source" value={sourceTop} />
      )}
    </div>
  );
}

function AnalyticsMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-white-30">{label}:</span>
      <span className="text-white-80 font-medium tabular-nums">{value}</span>
    </span>
  );
}

function formatResponseTime(seconds: number | null): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round((seconds / 3600) * 10) / 10}h`;
  return `${Math.round((seconds / 86400) * 10) / 10}d`;
}

const SOURCE_LABELS: Record<keyof InboxStats['bySource'], string> = {
  FORM: 'Forms',
  EMAIL_REPLY: 'Email',
  SOCIAL: 'Social',
  SOCIAL_COMMENT: 'Comments',
  REVIEW: 'Reviews',
  MANUAL: 'Manual',
};

function topSource(bySource: InboxStats['bySource']): string | null {
  const entries = Object.entries(bySource) as Array<[
    keyof InboxStats['bySource'],
    number,
  ]>;
  const nonZero = entries.filter(([, n]) => n > 0);
  if (nonZero.length === 0) return null;
  nonZero.sort((a, b) => b[1] - a[1]);
  const [key, n] = nonZero[0];
  return `${SOURCE_LABELS[key]} (${n})`;
}

interface StatPillProps {
  label: string;
  value: number | undefined;
  tone: 'accent' | 'default' | 'muted' | 'warn';
  /** Always visible — the Unread pill is the load-bearing one. */
  primary?: boolean;
  /** Collapse on narrow screens to keep the header scannable. */
  hideOnSmall?: boolean;
}

function StatPill({ label, value, tone, primary, hideOnSmall }: StatPillProps) {
  const toneClass =
    tone === 'accent'
      ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
      : tone === 'warn'
        ? 'bg-amber-400/10 text-amber-200 border-amber-400/30'
        : tone === 'muted'
          ? 'bg-white-5 text-white-50 border-white-10'
          : 'bg-white-5 text-white-90 border-white-15';

  return (
    <div
      className={cn(
        'inline-flex items-baseline gap-2 px-3 py-1.5 rounded-lg border',
        toneClass,
        hideOnSmall && 'hidden md:inline-flex',
      )}
    >
      <span
        className={cn(
          'text-sm font-bold tabular-nums',
          primary && (value ?? 0) > 0 && 'text-accent-green-110',
        )}
      >
        {value ?? '—'}
      </span>
      <span className="text-[10px] uppercase tracking-wider font-medium">
        {label}
      </span>
    </div>
  );
}

// Convenience re-export for callers that want the raw type without
// importing the hook module.
export type { InboxStats };
