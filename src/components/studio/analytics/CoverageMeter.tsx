'use client';

import type { CoverageSection } from '@/hooks/useSquadpitch';

type Props = CoverageSection;

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  CONNECTED: { dot: 'bg-green-400', label: 'Connected' },
  EXPIRED: { dot: 'bg-red-400', label: 'Expired' },
  NEEDS_RECONNECT: { dot: 'bg-yellow-400', label: 'Needs Reconnect' },
  ERROR: { dot: 'bg-red-400', label: 'Error' },
};

const HEALTH_LABELS: Record<string, { color: string; text: string }> = {
  healthy: { color: 'text-green-400', text: 'Healthy' },
  degraded: { color: 'text-yellow-400', text: 'Degraded' },
  unhealthy: { color: 'text-red-400', text: 'Unhealthy' },
};

export function CoverageMeter({
  totalPublished,
  withEngagementData,
  coveragePercent,
  coverageLabel,
  syncStatus,
  channelCoverage,
  connectionHealth,
  freshnessWarnings,
  overallHealth,
}: Props) {
  const barPercent = totalPublished > 0 ? Math.round((withEngagementData / totalPublished) * 100) : 0;
  const health = HEALTH_LABELS[overallHealth] || HEALTH_LABELS.healthy;

  return (
    <div className="space-y-4">
      {/* Overall coverage */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs text-white-60 uppercase tracking-wider">Overall Coverage</h4>
          <span className={`text-xs font-semibold ${health.color}`}>{health.text}</span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="h-2 w-full rounded-full bg-white-10 overflow-hidden">
            <div
              className="h-full rounded-full bg-zone-green transition-all"
              style={{ width: `${barPercent}%` }}
            />
          </div>
          <p className="text-xs text-white-60">
            {withEngagementData} of {totalPublished} posts have platform metrics ({coveragePercent}%)
          </p>
        </div>

        {/* Sync row */}
        <div className="flex items-center gap-3 text-xs text-white-40">
          <span>
            {syncStatus.lastSyncedAt
              ? `Last synced ${relativeTime(syncStatus.lastSyncedAt)}`
              : 'Not synced yet'}
          </span>
          {syncStatus.pendingSyncCount > 0 && (
            <span>{syncStatus.pendingSyncCount} pending</span>
          )}
        </div>

        {/* Contextual note */}
        {coverageLabel !== 'full' && (
          <p className="text-xs text-white-40">
            {coverageLabel === 'internal_only'
              ? 'Analytics are based on AI quality assessment. Engagement data will appear once channels are synced.'
              : `Engagement data available for ${coveragePercent}% of posts. Remaining posts use AI quality assessment.`}
          </p>
        )}
      </div>

      {/* Per-channel coverage */}
      {channelCoverage && channelCoverage.length > 0 && (
        <div className="card p-5">
          <h4 className="text-xs text-white-60 uppercase tracking-wider mb-3">Channel Coverage</h4>
          <div className="space-y-2.5">
            {channelCoverage.map((ch) => (
              <div key={ch.channel}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-white-80 font-mono">{ch.channel}</span>
                  <span className="text-white-60">
                    {ch.synced}/{ch.published} synced ({ch.coveragePercent}%)
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white-10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zone-green transition-all"
                    style={{ width: `${ch.coveragePercent}%` }}
                  />
                </div>
                {ch.lastSyncedAt && (
                  <p className="text-[10px] text-white-30 mt-0.5">
                    Last synced {relativeTime(ch.lastSyncedAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection health */}
      {connectionHealth && connectionHealth.length > 0 && (
        <div className="card p-5">
          <h4 className="text-xs text-white-60 uppercase tracking-wider mb-3">Connections</h4>
          <div className="space-y-2">
            {connectionHealth.map((c) => {
              const style = STATUS_STYLES[c.status] || STATUS_STYLES.ERROR;
              return (
                <div key={c.channel} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className="text-white-80 font-mono">{c.channel}</span>
                    {c.displayName && (
                      <span className="text-white-40 truncate max-w-[120px]">{c.displayName}</span>
                    )}
                  </div>
                  <span className="text-white-60">{style.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Freshness warnings */}
      {freshnessWarnings && freshnessWarnings.length > 0 && (
        <div className="card p-5">
          <h4 className="text-xs text-white-60 uppercase tracking-wider mb-3">Notices</h4>
          <div className="space-y-2">
            {freshnessWarnings.map((w, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-xs ${
                  w.severity === 'warning' ? 'text-yellow-400' : 'text-white-40'
                }`}
              >
                <span className="mt-0.5">{w.severity === 'warning' ? '!' : 'i'}</span>
                <span>{w.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
