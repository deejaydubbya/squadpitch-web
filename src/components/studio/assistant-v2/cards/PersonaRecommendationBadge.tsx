'use client';

import { User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonaRecommendation } from '@/hooks/useSquadpitch';

interface PersonaRecommendationBadgeProps {
  recommendation: PersonaRecommendation;
  onUsePersona: () => void;
  onSkip: () => void;
  isApplying?: boolean;
}

export function PersonaRecommendationBadge({
  recommendation,
  onUsePersona,
  onSkip,
  isApplying = false,
}: PersonaRecommendationBadgeProps) {
  const { safetyLevel, reason, shouldUsePersona } = recommendation;

  const isNotAllowed = safetyLevel === 'not_allowed';
  const isNeedsReview = safetyLevel === 'needs_review';

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px]',
        isNotAllowed && 'bg-white-5 border border-white-10',
        isNeedsReview && 'bg-amber-500/8 border border-amber-500/20',
        !isNotAllowed && !isNeedsReview && 'bg-accent-green/8 border border-accent-green/20',
      )}
    >
      <User className={cn(
        'w-3.5 h-3.5 mt-0.5 shrink-0',
        isNotAllowed && 'text-white-40',
        isNeedsReview && 'text-amber-400',
        !isNotAllowed && !isNeedsReview && 'text-accent-green',
      )} />

      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span className={cn(
          'font-medium leading-tight',
          isNotAllowed ? 'text-white-50' : isNeedsReview ? 'text-amber-300' : 'text-white-70',
        )}>
          {isNotAllowed ? 'Persona not recommended' : 'Persona recommended'}
        </span>

        <span className="text-[10px] text-white-40 leading-snug">
          {reason}
        </span>

        {/* Actions */}
        {isApplying ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Loader2 className="w-3 h-3 animate-spin text-accent-green" />
            <span className="text-[10px] text-white-40">Applying persona...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-0.5">
            {shouldUsePersona && (
              <button
                onClick={onUsePersona}
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded',
                  isNeedsReview
                    ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-accent-green/15 text-accent-green hover:bg-accent-green/25',
                )}
              >
                Use persona
              </button>
            )}
            <button
              onClick={onSkip}
              className="text-[10px] text-white-40 hover:text-white-60 px-1.5 py-0.5"
            >
              Skip
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
