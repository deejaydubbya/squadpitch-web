'use client';

import type { AnalyticsOverview } from '@/hooks/useSquadpitch';

interface Props {
  kpis: AnalyticsOverview['kpis'];
}

function capitalize(s: string | null): string {
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function KpiInsights({ kpis }: Props) {
  const items = [
    { label: 'Top Platform', value: capitalize(kpis.topPlatform) },
    { label: 'Best Content Type', value: capitalize(kpis.bestContentType) },
    { label: 'Best Media Type', value: capitalize(kpis.bestMediaType) },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="card p-3 text-center">
          <p className="text-[11px] text-white-40 uppercase tracking-wider">
            {item.label}
          </p>
          <p className="text-sm font-semibold text-white-100 mt-1">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
