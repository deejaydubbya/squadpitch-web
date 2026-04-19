'use client';

import { cn } from '@/lib/utils';

interface Props {
  label: string;
  current: number;
  limit: number;
  className?: string;
  /** Custom value formatter, e.g. for bytes → "245 MB" */
  formatValue?: (value: number) => string;
}

export function UsageMeter({ label, current, limit, className, formatValue }: Props) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);

  // 3-tier warning colors: green < 70%, amber 70-89%, orange 90-99%, red 100%+
  const barColor = isUnlimited
    ? 'bg-accent-green-110'
    : pct >= 100
      ? 'bg-accent-red'
      : pct >= 90
        ? 'bg-accent-orange'
        : pct >= 70
          ? 'bg-yellow-400'
          : 'bg-accent-green-110';

  const textColor = !isUnlimited && pct >= 100 ? 'text-accent-red' : 'text-white-60';

  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white-40">{label}</span>
        <span className={cn('text-xs font-mono', textColor)}>
          {fmt(current)}{isUnlimited ? '' : ` / ${fmt(limit)}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-white-10 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
