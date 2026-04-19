'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  helper?: string;
  tooltip?: string;
  variant?: 'blue' | 'purple' | 'amber' | 'default';
  sampleSize?: number;
}

const VALUE_COLORS = {
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  amber: 'text-amber-400',
  default: 'text-white-100',
} as const;

export function MetricCard({ label, value, helper, tooltip, variant = 'default', sampleSize }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-1">
        <p className="text-xs text-white-40 uppercase tracking-wider">{label}</p>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip((v) => !v)}
              className="text-white-30 hover:text-white-60 transition-colors"
            >
              <HelpCircle className="w-3 h-3" />
            </button>
            {showTooltip && (
              <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 px-3 py-2 rounded-lg bg-sp-dark border border-white-10 shadow-lg">
                <p className="text-[11px] text-white-60 leading-relaxed">{tooltip}</p>
              </div>
            )}
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold mt-1 ${VALUE_COLORS[variant]}`}>{value}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        {helper && <p className="text-[11px] text-white-40">{helper}</p>}
        {sampleSize != null && (
          <span
            className={`text-[10px] font-mono ${
              sampleSize < 10 ? 'text-amber-400/80' : 'text-white-30'
            }`}
          >
            ({sampleSize} posts)
          </span>
        )}
      </div>
    </div>
  );
}
