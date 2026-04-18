'use client';

import type { ClientAnalytics } from '@/hooks/useSquadpitch';

interface Props {
  analytics: ClientAnalytics;
}

export function AnalyticsStatCards({ analytics }: Props) {
  const approved =
    (analytics.byStatus.APPROVED ?? 0) +
    (analytics.byStatus.PUBLISHED ?? 0) +
    (analytics.byStatus.SCHEDULED ?? 0);
  const pending = analytics.byStatus.PENDING_REVIEW ?? 0;
  const rejected = analytics.byStatus.REJECTED ?? 0;

  const max14 = Math.max(1, ...analytics.last14Days.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total drafts" value={analytics.total} />
        <StatCard label="Approved" value={approved} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Rejected" value={rejected} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <StatCard
          label="Approval rate"
          value={`${Math.round(analytics.approvalRate * 100)}%`}
        />
        <StatCard
          label="Rejection rate"
          value={`${Math.round(analytics.rejectionRate * 100)}%`}
        />
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Drafts · last 14 days
        </h3>
        <div className="flex items-end gap-1.5 h-24">
          {analytics.last14Days.map((d) => (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center gap-1"
              title={`${d.date}: ${d.count}`}
            >
              <div
                className="w-full rounded-t bg-accent-green-110/60"
                style={{
                  height: `${(d.count / max14) * 100}%`,
                  minHeight: d.count > 0 ? '4px' : '0',
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-white-40 mt-1 font-mono">
          <span>{analytics.last14Days[0]?.date.slice(5)}</span>
          <span>
            {analytics.last14Days[analytics.last14Days.length - 1]?.date.slice(5)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BreakdownCard label="By kind" data={analytics.byKind} />
        <BreakdownCard label="By channel" data={analytics.byChannel} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-white-40 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white-100 mt-1">{value}</p>
    </div>
  );
}

function BreakdownCard({
  label,
  data,
}: {
  label: string;
  data: Record<string, number | undefined>;
}) {
  const entries = Object.entries(data).filter(([, v]) => (v ?? 0) > 0);
  const max = Math.max(1, ...entries.map(([, v]) => v ?? 0));
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        {label}
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs text-white-40 italic">Publish posts to see stats here.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, count]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white-80 font-mono">{key}</span>
                <span className="text-white-60">{count}</span>
              </div>
              <div className="h-1.5 bg-white-10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-green-110"
                  style={{ width: `${((count ?? 0) / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
