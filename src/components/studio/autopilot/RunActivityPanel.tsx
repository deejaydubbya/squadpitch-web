'use client';

import {
  Radar,
  Sparkles,
  AlertCircle,
  PauseCircle,
  Activity,
} from 'lucide-react';
import type {
  AutopilotRun,
  AutopilotActivityItem,
} from '@/hooks/useSquadpitch';
import { runDetailFragments } from './runActivity.helpers';
import { cn } from '@/lib/utils';

interface RunActivityPanelProps {
  runs: AutopilotRun[] | undefined;
  drafts: AutopilotActivityItem[] | undefined;
  loading?: boolean;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

interface FeedRow {
  key: string;
  Icon: typeof Sparkles;
  iconClass: string;
  body: string;
  when: string;
}

function runRow(run: AutopilotRun): FeedRow {
  const when = relativeTime(run.startedAt);
  const fragments = runDetailFragments(run);
  const detailSuffix = fragments.length > 0 ? ` (${fragments.join(', ')})` : '';

  if (run.status === 'created_recommendations') {
    const n = run.recommendationsCreated;
    return {
      key: `run-${run.id}`,
      Icon: Sparkles,
      iconClass: 'text-accent-green-110',
      body: `Autopilot scanned and found ${n} new opportunit${n === 1 ? 'y' : 'ies'}${detailSuffix}.`,
      when,
    };
  }
  if (run.status === 'updated_recommendations') {
    const n = run.recommendationsUpdated;
    return {
      key: `run-${run.id}`,
      Icon: Activity,
      iconClass: 'text-cyan-400',
      body: `Autopilot refreshed ${n} existing opportunit${n === 1 ? 'y' : 'ies'}${detailSuffix}.`,
      when,
    };
  }
  if (run.status === 'no_action') {
    const why = run.metadata?.summary?.noActionReason ?? run.reason ?? 'no new opportunities yet';
    return {
      key: `run-${run.id}`,
      Icon: Radar,
      iconClass: 'text-white-40',
      body: `Autopilot scanned — ${why}${detailSuffix}.`,
      when,
    };
  }
  if (run.status === 'skipped') {
    return {
      key: `run-${run.id}`,
      Icon: PauseCircle,
      iconClass: 'text-yellow-400',
      body: `Scan skipped — ${run.reason ?? 'preconditions not met'}.`,
      when,
    };
  }
  return {
    key: `run-${run.id}`,
    Icon: AlertCircle,
    iconClass: 'text-red-400',
    body: `Run failed — ${run.errorMessage ?? run.reason ?? 'unknown error'}.`,
    when,
  };
}

function draftRow(item: AutopilotActivityItem): FeedRow {
  const when = relativeTime(item.createdAt ?? null);
  const label = item.trigger ? `${item.channel} · ${item.trigger}` : item.channel;
  if (item.eventType === 'skipped') {
    return {
      key: `draft-${item.id}`,
      Icon: PauseCircle,
      iconClass: 'text-yellow-400',
      body: `Skipped ${label}${item.reason ? ` — ${item.reason}` : ''}.`,
      when,
    };
  }
  if (item.eventType === 'failed') {
    return {
      key: `draft-${item.id}`,
      Icon: AlertCircle,
      iconClass: 'text-red-400',
      body: `Draft failed for ${label}.`,
      when,
    };
  }
  if (item.eventType === 'scheduled') {
    return {
      key: `draft-${item.id}`,
      Icon: Activity,
      iconClass: 'text-violet-400',
      body: `Draft scheduled for ${label}.`,
      when,
    };
  }
  if (item.eventType === 'published') {
    return {
      key: `draft-${item.id}`,
      Icon: Activity,
      iconClass: 'text-green-400',
      body: `Published to ${label}.`,
      when,
    };
  }
  return {
    key: `draft-${item.id}`,
    Icon: Sparkles,
    iconClass: 'text-accent-green-110',
    body: `Prepared draft for ${label}.`,
    when,
  };
}

export function RunActivityPanel({ runs, drafts, loading }: RunActivityPanelProps) {
  const rows: FeedRow[] = [];

  for (const r of (runs ?? []).slice(0, 5)) rows.push(runRow(r));
  for (const d of (drafts ?? []).slice(0, 5)) rows.push(draftRow(d));

  // Sort by recency — runs and drafts use different stamps but both
  // pass through relativeTime; sort by the underlying timestamps.
  const withTs = rows.map((row, i) => ({
    row,
    ts:
      i < (runs?.slice(0, 5).length ?? 0)
        ? new Date(runs![i].startedAt).getTime()
        : new Date(
            drafts![i - (runs?.slice(0, 5).length ?? 0)].createdAt ?? 0,
          ).getTime(),
  }));
  withTs.sort((a, b) => b.ts - a.ts);
  const ordered = withTs.slice(0, 8).map((x) => x.row);

  return (
    <section
      data-testid="autopilot-activity"
      className="card p-5 border-white-10"
    >
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-accent-green-110" />
        <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
          Recent Autopilot Activity
        </h2>
      </div>

      {ordered.length === 0 ? (
        <p className={cn('text-xs text-white-40 py-4', loading && 'animate-pulse')}>
          {loading
            ? 'Loading activity…'
            : "No activity yet. Once Autopilot runs, you'll see a feed of scans, drafts, and skips here."}
        </p>
      ) : (
        <ul className="space-y-3">
          {ordered.map((row) => (
            <li key={row.key} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white-5 flex items-center justify-center shrink-0 mt-0.5">
                <row.Icon className={cn('w-3.5 h-3.5', row.iconClass)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white-80 leading-snug">{row.body}</p>
                <p className="text-[10px] text-white-40 mt-0.5">{row.when}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
