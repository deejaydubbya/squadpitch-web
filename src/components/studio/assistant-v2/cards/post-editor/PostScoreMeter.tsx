'use client';

import { useState } from 'react';
import { Target, Check, AlertTriangle, X, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PostScoreMeterProps } from './types';

function getGradeLabel(value: number): string {
  if (value >= 8) return 'Strong';
  if (value >= 6) return 'Good';
  if (value >= 3) return 'Needs work';
  return 'Weak';
}

function getGradeColor(value: number): string {
  if (value >= 8) return 'text-accent-green-110';
  if (value >= 6) return 'text-accent-green-110/70';
  if (value >= 3) return 'text-accent-orange';
  return 'text-accent-red';
}

function getBarColor(value: number): string {
  if (value >= 8) return 'bg-accent-green-110';
  if (value >= 6) return 'bg-accent-green-110/70';
  if (value >= 3) return 'bg-accent-orange';
  return 'bg-accent-red';
}

export function PostScoreMeter({ score, compact }: PostScoreMeterProps) {
  const [showDetails, setShowDetails] = useState(false);
  const pct = (score.value / score.max) * 100;

  const actionableItems = compact
    ? score.breakdown.filter((item) => item.grade === 'weak' || item.grade === 'missing')
    : score.breakdown;

  // In compact mode with nothing actionable, show nothing
  if (compact && actionableItems.length === 0) return null;

  return (
    <div className="rounded-lg bg-white-5 border border-white-10 p-3 space-y-2">
      {/* Header: bar + grade label — hidden in compact mode */}
      {!compact && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-accent-green-110" />
            <span className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
              Post Strength
            </span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-1.5 rounded-full bg-white-10 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', getBarColor(score.value))}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={cn('text-xs font-bold', getGradeColor(score.value))}>
              {getGradeLabel(score.value)}
            </span>
          </div>
        </div>
      )}

      {/* Breakdown items with grade icons */}
      <ul className="space-y-0.5">
        {actionableItems.map((item, i) => (
          <li key={i} className="text-[11px] text-white-60 flex items-center gap-1.5">
            {item.grade === 'strong' || item.grade === 'decent' ? (
              <Check className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
            ) : item.grade === 'weak' ? (
              <AlertTriangle className="w-3 h-3 text-accent-orange flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-accent-red flex-shrink-0" />
            )}
            {item.label}
          </li>
        ))}
      </ul>

      {/* Expandable numeric details — hidden in compact mode */}
      {!compact && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 text-[10px] text-white-30 hover:text-white-50 transition-colors"
          >
            <ChevronRight className={cn('w-3 h-3 transition-transform', showDetails && 'rotate-90')} />
            {showDetails ? 'Hide scoring details' : 'Show scoring details'}
          </button>
          {showDetails && (
            <ul className="space-y-0.5 pl-4 border-l border-white-10">
              {score.breakdown.map((item, i) => (
                <li key={i} className="text-[10px] text-white-30 tabular-nums">
                  {item.label}: {item.points}/{item.maxPoints}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
