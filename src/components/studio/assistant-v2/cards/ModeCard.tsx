'use client';

import { Layers, Zap } from 'lucide-react';
import type { AssistantAction } from '@/lib/assistant/types';

interface Props {
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function ModeCard({ onSelection }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onSelection({ type: 'SET_MODE', payload: 'campaign' }, 'Mode: Campaign')}
        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white-10 hover:border-accent-green-110 hover:bg-accent-green-110/5 transition-colors text-center"
      >
        <Layers className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Campaign</span>
        <span className="text-[11px] text-white-40">Plan several connected posts around a goal</span>
        <span className="text-[10px] text-white-30 italic">Best for planning a week or launch.</span>
      </button>

      <button
        onClick={() => onSelection({ type: 'SET_MODE', payload: 'quick_post' }, 'Mode: Single Post')}
        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white-10 hover:border-accent-green-110 hover:bg-accent-green-110/5 transition-colors text-center"
      >
        <Zap className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Single Post</span>
        <span className="text-[11px] text-white-40">Create one post right now</span>
        <span className="text-[10px] text-white-30 italic">Best when you need something to post today.</span>
      </button>
    </div>
  );
}
