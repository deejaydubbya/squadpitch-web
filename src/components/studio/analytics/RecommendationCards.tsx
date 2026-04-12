'use client';

import type { Recommendation } from '@/hooks/useSquadpitch';

interface Props {
  recommendations: Recommendation[];
}

const CATEGORY_LABELS: Record<string, string> = {
  content: 'Content',
  platform: 'Platform',
  media: 'Media',
  timing: 'Timing',
  cadence: 'Cadence',
  hooks: 'Hooks',
};

export function RecommendationCards({ recommendations }: Props) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-white-100 uppercase tracking-wider mb-3">
        What to Do Next
      </h3>
      {recommendations.length === 0 ? (
        <p className="text-xs text-white-40 italic">
          Not enough data yet — keep posting and check back.
        </p>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.category}
              className="rounded-lg border border-white-10 bg-white-5 p-3"
            >
              <div className="flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-white-10 text-[10px] text-white-60 font-mono uppercase shrink-0">
                  {CATEGORY_LABELS[rec.category] || rec.category}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white-100">
                    {rec.title}
                  </p>
                  <p className="text-xs text-white-60 mt-1">{rec.reason}</p>
                  <p className="text-xs text-green-400 mt-1 font-medium">
                    {rec.suggestedAction}
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
