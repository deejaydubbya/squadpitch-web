'use client';

import Link from 'next/link';
import { Zap, ChevronRight, AlertTriangle } from 'lucide-react';
import { useAutopilotStatus, useAutopilotReadiness } from '@/hooks/useSquadpitch';
import { cn } from '@/lib/utils';

const MODE_LABELS: Record<string, string> = {
  off: 'Off',
  draft_only: 'Draft Only',
  schedule_approved: 'Schedule Approved',
  auto_publish: 'Auto Publish',
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
