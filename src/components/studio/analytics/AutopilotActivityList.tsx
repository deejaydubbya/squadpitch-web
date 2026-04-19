'use client';

import type { AutopilotActivity } from '@/hooks/useSquadpitch';
import { ScoreBadge } from './ScoreBadge';

const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'bg-green-900/30 text-green-400',
  APPROVED: 'bg-blue-900/30 text-blue-400',
  SCHEDULED: 'bg-blue-900/30 text-blue-400',
  DRAFT: 'bg-white-10 text-white-60',
  PENDING_REVIEW: 'bg-amber-900/30 text-amber-400',
  REJECTED: 'bg-red-900/30 text-red-400',
  FAILED: 'bg-red-900/30 text-red-400',
};

const TRIGGER_LABELS: Record<string, string> = {
  new_listing: 'New Listing',
  inactivity_gap: 'Inactivity',
  new_review: 'Review',
  new_milestone: 'Milestone',
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  activity: AutopilotActivity[];
}

export function AutopilotActivityList({ activity }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        Recent Autopilot Activity
      </h3>
      {activity.length === 0 ? (
        <p className="text-xs text-white-40 italic">No recent autopilot activity.</p>
      ) : (
        <div className="space-y-3">
          {activity.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 pb-2 border-b border-white-10 last:border-0 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white-80 line-clamp-1 leading-relaxed">
                  {a.body || '(no body)'}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      STATUS_COLORS[a.status] || 'bg-white-10 text-white-60'
                    }`}
                  >
                    {a.status}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono">
                    {a.channel}
                  </span>
                  {a.trigger && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-900/30 text-[10px] text-purple-400 font-mono">
                      {TRIGGER_LABELS[a.trigger] || a.trigger}
                    </span>
                  )}
                  {a.score != null && (
                    <ScoreBadge score={a.score} variant="composite" />
                  )}
                  {a.createdAt && (
                    <span className="text-[10px] text-white-40">
                      {formatDate(a.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
