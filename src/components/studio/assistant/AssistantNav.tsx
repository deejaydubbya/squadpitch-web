'use client';

import { ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  canAdvance: boolean;
  canGoBack: boolean;
  isSkippable: boolean;
  onNext: () => void;
  onBack: () => void;
}

export function AssistantNav({ canAdvance, canGoBack, isSkippable, onNext, onBack }: Props) {
  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white-10">
      {/* Back */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
          canGoBack
            ? 'text-white-60 hover:bg-white-5 hover:text-white-100'
            : 'text-white-20 cursor-not-allowed'
        )}
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-3">
        {/* Skip */}
        {isSkippable && (
          <button
            onClick={onNext}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white-60 hover:bg-white-5 hover:text-white-100 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip
          </button>
        )}

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
            canAdvance
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-110/90'
              : 'bg-white-10 text-white-40 cursor-not-allowed'
          )}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
