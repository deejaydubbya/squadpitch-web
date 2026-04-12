'use client';

import type { AnalyticsOverview } from '@/hooks/useSquadpitch';

interface Props {
  summary: AnalyticsOverview['summary'];
  hasEngagementData?: boolean;
}

function formatNumber(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatPercent(n: number | null): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

export function AnalyticsHeroKpis({ summary, hasEngagementData = false }: Props) {
  const dataSourceLabel = hasEngagementData
    ? 'Based on real engagement'
    : 'Based on content quality';

  const cards = [
    {
      label: 'Performance Score',
      value: summary.performanceScore != null ? Math.round(summary.performanceScore).toString() : '—',
      helper: 'Avg content quality',
    },
    {
      label: 'Avg Engagement Rate',
      value: formatPercent(summary.engagementRate),
      helper: 'Platform engagement',
    },
    {
      label: 'Total Reach',
      value: formatNumber(summary.totalReach),
      helper: 'People reached',
    },
    {
      label: 'Posts Published',
      value: summary.postsPublished.toString(),
      helper: 'In selected range',
    },
  ];

  return (
    <div>
      <p className="text-[11px] text-white-30 mb-2">{dataSourceLabel}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs text-white-40 uppercase tracking-wider">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-white-100 mt-1">{card.value}</p>
            <p className="text-[11px] text-white-40 mt-0.5">{card.helper}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
