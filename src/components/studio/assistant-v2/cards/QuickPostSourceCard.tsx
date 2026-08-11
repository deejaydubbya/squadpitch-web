'use client';

import { Database, Lightbulb } from 'lucide-react';
import type { AssistantAction } from '@/lib/assistant/types';

interface Props {
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function QuickPostSourceCard({ onSelection }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        onClick={() =>
          onSelection(
            { type: 'SET_QUICK_POST_SOURCE', payload: 'data' },
            'Source: Use my data'
          )
        }
        className="flex min-h-24 flex-col items-center gap-2 rounded-lg border border-white-10 p-3 text-center transition-colors hover:border-accent-green-110 hover:bg-accent-green-110/5"
      >
        <Database className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Use my data</span>
        <span className="text-[11px] text-white-40">Pull facts from your library</span>
      </button>

      <button
        onClick={() =>
          onSelection(
            { type: 'SET_QUICK_POST_SOURCE', payload: 'idea' },
            'Source: Start from an idea'
          )
        }
        className="flex min-h-24 flex-col items-center gap-2 rounded-lg border border-white-10 p-3 text-center transition-colors hover:border-accent-green-110 hover:bg-accent-green-110/5"
      >
        <Lightbulb className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Start from an idea</span>
        <span className="text-[11px] text-white-40">Describe what you want to post</span>
      </button>
    </div>
  );
}
