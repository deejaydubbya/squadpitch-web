'use client';

import type { AssistantAction } from '@/lib/assistant/types';
import { GOALS } from './quickPostConstants';

interface Props {
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function QuickPostGoalCard({ onSelection }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {GOALS.map((g) => (
        <button
          key={g}
          type="button"
          onClick={() =>
            onSelection(
              { type: 'SET_QUICK_POST_GOAL', payload: g },
              `Goal: ${g}`
            )
          }
          className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors bg-white-10 text-white-60 hover:bg-accent-green-110 hover:text-sp-surface"
        >
          {g}
        </button>
      ))}
    </div>
  );
}
