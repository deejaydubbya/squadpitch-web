'use client';

import { CalendarDays, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeekSummary } from '@/hooks/useSquadpitch';

interface Props {
  weekSummary: WeekSummary | null;
  onPlanMyWeek: () => void;
  isPlanningWeek: boolean;
  planResult?: { generated: number; scheduled: number } | null;
  hasSuggestions: boolean;
}

const ANGLE_LABELS: Record<string, string> = {
  listing: 'Listings',
  buyer: 'Buyer',
  lifestyle: 'Lifestyle',
  authority: 'Authority',
};

export function WeekPlanSummary({
  weekSummary,
  onPlanMyWeek,
  isPlanningWeek,
  planResult,
  hasSuggestions,
}: Props) {
  if (!weekSummary && !planResult) return null;

  // After successful plan-week execution
  if (planResult && planResult.generated > 0) {
    return (
      <div className="card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-accent-green-110">
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">
            Week planned — {planResult.generated} draft{planResult.generated !== 1 ? 's' : ''} created
            {planResult.scheduled > 0 && `, ${planResult.scheduled} scheduled`}
          </span>
        </div>
      </div>
    );
  }

  if (!weekSummary) return null;

  const { published, scheduled, target, gap, missingAngleCategories, status } = weekSummary;

  return (
    <div className="card px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 text-sm text-white-80 flex-wrap min-w-0">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="w-4 h-4 text-white-40 flex-shrink-0" />
          <span>
            <span className="font-medium text-white-100">{published}</span> posted,{' '}
            <span className="font-medium text-white-100">{scheduled}</span> scheduled
          </span>
        </div>

        <span className="text-white-20">|</span>

        <span>
          Target: <span className="font-medium text-white-100">{target}</span>
        </span>

        {gap > 0 && (
          <>
            <span className="text-white-20">|</span>
            <span className={cn(
              'font-medium',
              status === 'below' ? 'text-amber-400' : 'text-white-60'
            )}>
              {gap} gap{gap !== 1 ? 's' : ''}
            </span>
          </>
        )}

        {missingAngleCategories.length > 0 && (
          <>
            <span className="text-white-20">|</span>
            <span className="text-white-40">
              Missing: {missingAngleCategories.map((c) => ANGLE_LABELS[c] ?? c).join(', ')}
            </span>
          </>
        )}
      </div>

      {gap > 0 && hasSuggestions && (
        <button
          onClick={onPlanMyWeek}
          disabled={isPlanningWeek}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0',
            'bg-accent-green-110 text-sp-dark hover:bg-accent-green-110/90',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isPlanningWeek ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Planning...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Plan My Week
            </>
          )}
        </button>
      )}

      {gap > 0 && !hasSuggestions && (
        <p className="text-xs text-white-40 flex-shrink-0">
          No suggestions available — add business data or connect channels
        </p>
      )}
    </div>
  );
}
