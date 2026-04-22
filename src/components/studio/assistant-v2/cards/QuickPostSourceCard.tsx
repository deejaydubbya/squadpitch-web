'use client';

import { Database, Lightbulb } from 'lucide-react';
import type { AssistantAction } from '@/lib/assistant/types';

interface Props {
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function QuickPostSourceCard({ onSelection }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() =>
          onSelection(
            { type: 'SET_QUICK_POST_SOURCE', payload: 'data' },
            'Source: Use my data'
          )
        }
        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white-10 hover:border-accent-green-110 hover:bg-accent-green-110/5 transition-colors text-center"
      >
        <Database className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Use my data</span>
        <span className="text-[11px] text-white-40">Pick a data item</span>
      </button>

      <button
        onClick={() =>
          onSelection(
            { type: 'SET_QUICK_POST_SOURCE', payload: 'idea' },
            'Source: Start from an idea'
          )
        }
        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white-10 hover:border-accent-green-110 hover:bg-accent-green-110/5 transition-colors text-center"
      >
        <Lightbulb className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Start from an idea</span>
        <span className="text-[11px] text-white-40">Describe your topic</span>
      </button>
    </div>
  );
}
