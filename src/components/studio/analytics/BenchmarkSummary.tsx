'use client';

import type { BenchmarksSection } from '@/hooks/useSquadpitch';

function formatScore(n: number | null): string {
  if (n == null) return '—';
  return Math.round(n).toString();
}

function formatPercent(n: number | null): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

function confidenceBadge(confidence: string) {
  const colors: Record<string, string> = {
    high: 'bg-green-900/30 text-green-400',
    medium: 'bg-amber-900/30 text-amber-400',
    low: 'bg-red-900/30 text-red-400',
    insufficient: 'bg-white-10 text-white-40',
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${colors[confidence] || colors.insufficient}`}>
      {confidence} ({confidence === 'insufficient' ? '<3' : confidence === 'low' ? '3-4' : confidence === 'medium' ? '5-9' : '10+'} posts)
    </span>
  );
}

interface Props {
  benchmarks: BenchmarksSection;
}

export function BenchmarkSummary({ benchmarks }: Props) {
  if (!benchmarks.hasData) return null;

  const ws = benchmarks.workspace;
  const channels = Object.entries(benchmarks.byChannel).sort(
    (a, b) => (b[1].avgScore ?? 0) - (a[1].avgScore ?? 0),
  );
  const contentTypes = Object.entries(benchmarks.byContentType).sort(
    (a, b) => (b[1].avgScore ?? 0) - (a[1].avgScore ?? 0),
  );

  return (
    <div className="space-y-4">
      {/* Workspace baseline */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
          Your Baselines
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-white-40 mb-1">Avg Score</p>
            <p className="text-lg font-semibold text-white-100">{formatScore(ws.avgScore)}</p>
          </div>
          <div>
            <p className="text-xs text-white-40 mb-1">Avg Engagement</p>
            <p className="text-lg font-semibold text-white-100">{formatPercent(ws.avgEngagementRate)}</p>
          </div>
          <div>
            <p className="text-xs text-white-40 mb-1">Confidence</p>
            <div className="pt-1">{confidenceBadge(ws.confidence)}</div>
          </div>
        </div>
      </div>

      {/* Channel benchmarks */}
      {channels.length > 1 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
            By Channel
          </h3>
          <div className="space-y-2">
            {channels.map(([channel, bm]) => (
              <div key={channel} className="flex items-center justify-between text-xs">
                <span className="text-white-80 font-mono">{channel}</span>
                <div className="flex items-center gap-4">
                  <span className="text-white-60">
                    Score: <span className="text-white-100 font-semibold">{formatScore(bm.avgScore)}</span>
                  </span>
                  <span className="text-white-60">
                    ER: <span className="text-white-100 font-semibold">{formatPercent(bm.avgEngagementRate)}</span>
                  </span>
                  {confidenceBadge(bm.confidence)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content type benchmarks */}
      {contentTypes.length > 1 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
            By Content Type
          </h3>
          <div className="space-y-2">
            {contentTypes.map(([ct, bm]) => (
              <div key={ct} className="flex items-center justify-between text-xs">
                <span className="text-white-80 font-mono capitalize">{ct}</span>
                <div className="flex items-center gap-4">
                  <span className="text-white-60">
                    Score: <span className="text-white-100 font-semibold">{formatScore(bm.avgScore)}</span>
                  </span>
                  <span className="text-white-60">
                    ER: <span className="text-white-100 font-semibold">{formatPercent(bm.avgEngagementRate)}</span>
                  </span>
                  {confidenceBadge(bm.confidence)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
