'use client';

import Link from 'next/link';
import { Zap, ChevronRight, AlertTriangle, Megaphone } from 'lucide-react';
import { useAutopilotStatus, useAutopilotReadiness, useAutopilotCampaignStats } from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';

const MODE_LABELS: Record<string, string> = {
  off: 'Off',
  recommend_only: 'Recommendations only',
  draft_on_click: 'Generate drafts manually',
  auto_generate_drafts: 'Auto-prepare drafts',
  schedule_after_approval: 'Auto-schedule approved',
  auto_publish_guarded: 'Auto-publish (coming soon)',
  // Legacy alias.
  draft_only: 'Generate drafts manually',
};

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface Props {
  clientId: string;
  base: string;
}

export function AutopilotStatusCard({ clientId, base }: Props) {
  const { data: status } = useAutopilotStatus(clientId);
  const { data: readiness } = useAutopilotReadiness(clientId);
  const { data: campaignStats } = useAutopilotCampaignStats(clientId);
  const campaignsReady = (campaignStats?.pendingCount ?? 0) + (campaignStats?.readyCount ?? 0);

  if (!status) return null;

  const hasIssue = readiness && !readiness.ready;

  return (
    <div className="card p-5 border-white-10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className={cn('w-4 h-4', status.enabled ? 'text-yellow-400' : 'text-white-40')} />
          <h2 className="text-sm font-semibold text-white-100 uppercase tracking-wider">
            Autopilot
          </h2>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-semibold',
              status.enabled
                ? 'bg-green-500/15 text-green-400'
                : 'bg-white-10 text-white-60',
            )}
          >
            {status.enabled ? 'Active' : 'Off'}
          </span>
        </div>
        <Link
          href={`${base}/autopilot`}
          className="flex items-center gap-1 text-xs text-white-40 hover:text-accent-green-110 transition-colors"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-[10px] text-white-40 uppercase tracking-wider">Mode</p>
          <p className="text-sm text-white-100 font-medium mt-0.5">
            {MODE_LABELS[status.mode] ?? status.mode}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white-40 uppercase tracking-wider">This Week</p>
          <p className="text-sm text-white-100 font-medium mt-0.5">
            {status.draftsThisWeek} / {status.maxDraftsPerWeek}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-white-40 uppercase tracking-wider">Last Action</p>
          <p className="text-sm text-white-100 font-medium mt-0.5">
            {formatRelative(status.lastActionAt)}
          </p>
        </div>
      </div>

      {/* Last action description */}
      {status.lastActionAt && status.lastActionType && (
        <p className="text-xs text-white-50 mb-3 line-clamp-1">
          {status.lastActionType.replace(/_/g, ' ')}{status.lastActionChannel ? ` on ${status.lastActionChannel}` : ''} · {formatRelative(status.lastActionAt)}
        </p>
      )}

      {campaignsReady > 0 && (
        <Link
          href={`${base}/autopilot`}
          className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-accent-green-110/10 border border-accent-green-110/20 hover:border-accent-green-110/30 transition-colors"
        >
          <Megaphone className="w-3.5 h-3.5 text-accent-green-110 flex-shrink-0" />
          <p className="text-xs text-accent-green-110 font-medium">
            {campaignsReady} campaign{campaignsReady > 1 ? 's' : ''} ready for review
          </p>
          <ChevronRight className="w-3 h-3 text-accent-green-110/60 ml-auto" />
        </Link>
      )}

      {hasIssue && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-400">
            {readiness.checks.filter((c) => !c.met).map((c) => c.label).join(', ')} —
            <Link href={`${base}/autopilot`} className="underline hover:text-yellow-300 ml-1">
              Fix now
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
