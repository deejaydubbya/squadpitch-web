'use client';

import type { Insight } from '@/hooks/useSquadpitch';

interface Props {
  insights: Insight[];
}

function confidenceBadge(confidence: string) {
  const isHigh = confidence === 'high';
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
        isHigh
          ? 'bg-green-500/15 text-green-400'
          : 'bg-amber-500/15 text-amber-400'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isHigh ? 'bg-green-400' : 'bg-amber-400'}`} />
      {isHigh ? 'High confidence' : 'Medium confidence'}
    </span>
  );
}

function evidenceFooter(metrics: Record<string, unknown>) {
  const parts: string[] = [];
  if (metrics.avgScore != null) parts.push(`Score ${metrics.avgScore}`);
  if (metrics.gap != null) parts.push(`Gap +${metrics.gap} pts`);
  if (metrics.count != null) parts.push(`n=${metrics.count}`);
  if (parts.length === 0) return null;
  return (
    <div className="mt-2 pt-2 border-t border-white-10 flex items-center gap-3">
      {parts.map((part) => (
        <span key={part} className="text-[10px] text-white-30 font-mono">
          {part}
        </span>
      ))}
    </div>
  );
}

export function InsightCards({ insights }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        What&apos;s Working
      </h3>
      {insights.length === 0 ? (
        <p className="text-xs text-white-40 italic">
          Publish more posts to see what&apos;s working best for your audience.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight) => (
            <div
              key={insight.type}
              className="rounded-lg border border-white-10 bg-white-5 p-3"
            >
              <div className="flex items-start gap-2">
                {confidenceBadge(insight.confidence)}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white-100">
                    {insight.title}
                  </p>
                  <p className="text-xs text-white-60 mt-1 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
              {insight.supportingMetrics && evidenceFooter(insight.supportingMetrics)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
