'use client';

import type { AnalyticsRange } from '@/hooks/useSquadpitch';

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

interface Props {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}

export function RangeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r.value}
          onClick={() => onChange(r.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            value === r.value
              ? 'bg-accent-green-110 text-sp-bg'
              : 'text-white-60 hover:text-white-100 hover:bg-white-10'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
