'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';
import { useAutopilotSettings, useAutopilotStatus } from '@/hooks/useSquadpitch';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/lib/utils';

const MODE_LABELS: Record<string, string> = {
  off: 'Off',
  recommend_only: 'Recommendations only',
  draft_on_click: 'Generate drafts manually',
  auto_generate_drafts: 'Auto-prepare drafts for review',
  schedule_after_approval: 'Auto-schedule approved drafts',
  auto_publish_guarded: 'Auto-publish (coming soon)',
  // Legacy alias — server normalizes to draft_on_click, but
  // cache might briefly carry the old name.
  draft_only: 'Generate drafts manually',
};

export default function AutopilotSettingsPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  const { data: settings, isLoading: settingsLoading } = useAutopilotSettings(clientId);
  const { data: status, isLoading: statusLoading } = useAutopilotStatus(clientId);

  if (settingsLoading || statusLoading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <LoadingSpinner size="sm" />
        <span className="text-white-40 text-sm">Loading autopilot…</span>
      </div>
    );
  }

  const mode = status?.mode ?? settings?.mode ?? 'off';
  const isActive = settings?.enabled && mode !== 'off';

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white-100">Autopilot</h2>
            <p className="text-sm text-white-40 mt-0.5">
              Autopilot automatically generates content based on your strategy and sources.
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
              isActive
                ? 'bg-accent-green-110/20 text-accent-green-110'
                : 'bg-white-10 text-white-40'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                isActive ? 'bg-accent-green-110' : 'bg-white-40'
              )}
            />
            {isActive ? 'Active' : 'Off'}
          </span>
        </div>

        {/* Mode */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white-5">
          <div>
            <p className="text-xs font-medium text-white-40 uppercase tracking-wider">Mode</p>
            <p className="text-sm text-white-100 mt-0.5">{MODE_LABELS[mode] ?? mode}</p>
          </div>
          <Zap className={cn('w-5 h-5', isActive ? 'text-accent-green-110' : 'text-white-20')} />
        </div>

        {/* Weekly stats */}
        {status && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white-5">
              <p className="text-xs font-medium text-white-40 uppercase tracking-wider">
                Drafts this week
              </p>
              <p className="text-lg font-bold text-white-100 mt-0.5">
                {status.draftsThisWeek}
                <span className="text-sm font-normal text-white-40">
                  {' '}/ {status.maxDraftsPerWeek}
                </span>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white-5">
              <p className="text-xs font-medium text-white-40 uppercase tracking-wider">
                Last action
              </p>
              <p className="text-sm text-white-100 mt-0.5">
                {status.lastActionAt
                  ? new Date(status.lastActionAt).toLocaleDateString()
                  : 'None yet'}
              </p>
            </div>
          </div>
        )}

        {/* Link to full autopilot page */}
        <Link
          href={`/workspaces/${clientId}/autopilot`}
          className="btn btn-primary text-xs flex items-center gap-1.5 w-fit"
        >
          <Zap className="w-3.5 h-3.5" />
          Manage Autopilot
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
