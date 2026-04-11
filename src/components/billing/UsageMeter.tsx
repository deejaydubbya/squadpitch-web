'use client';

import { cn } from '@/lib/utils';

interface Props {
  label: string;
  current: number;
  limit: number;
  className?: string;
}

export function UsageMeter({ label, current, limit, className }: Props) {
  const isUnlimited = !isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && pct >= 80;
  const isAtLimit = !isUnlimited && pct >= 100;

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white-40">{label}</span>
        <span className={cn('text-xs font-mono', isAtLimit ? 'text-accent-red' : 'text-white-60')}>
          {current}{isUnlimited ? '' : ` / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-1.5 rounded-full bg-white-10 overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isAtLimit
                ? 'bg-accent-red'
                : isNearLimit
                  ? 'bg-accent-orange'
                  : 'bg-accent-green-110'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
