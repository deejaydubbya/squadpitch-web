'use client';

import type { Insight } from '@/hooks/useSquadpitch';

interface Props {
  insights: Insight[];
}

function confidenceDot(confidence: string) {
  const color = confidence === 'high' ? 'bg-green-400' : 'bg-yellow-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${color} shrink-0 mt-0.5`} />;
}

export function InsightCards({ insights }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        What&apos;s Working
      </h3>
      {insights.length === 0 ? (
        <p className="text-xs text-white-40 italic">
          Not enough data yet — keep posting and check back.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((insight) => (
            <div
              key={insight.type}
              className="rounded-lg border border-white-10 bg-white-5 p-3"
            >
              <div className="flex items-start gap-2">
                {confidenceDot(insight.confidence)}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white-100">
                    {insight.title}
                  </p>
                  <p className="text-xs text-white-60 mt-1 leading-relaxed">
                    {insight.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
