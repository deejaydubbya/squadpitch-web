'use client';

import { Layers, Zap } from 'lucide-react';
import type { AssistantAction } from '@/lib/assistant/types';

interface Props {
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function ModeCard({ onSelection }: Props) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onSelection({ type: 'SET_MODE', payload: 'campaign' }, 'Mode: Campaign')}
        className="order-2 flex min-h-28 flex-col items-center gap-2 rounded-lg border border-white-10 p-3 text-center transition-colors hover:border-accent-green-110 hover:bg-accent-green-110/5 sm:order-1"
      >
        <Layers className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Campaign</span>
        <span className="text-[11px] text-white-40">Plan several connected posts around a goal</span>
        <span className="text-[10px] text-white-30 italic">Best for planning a week or launch.</span>
        <span className="text-[10px] font-medium text-white-40 sm:hidden">Desktop recommended</span>
      </button>

      <button
        type="button"
        onClick={() => onSelection({ type: 'SET_MODE', payload: 'quick_post' }, 'Mode: Single Post')}
        className="order-1 flex min-h-28 flex-col items-center gap-2 rounded-lg border border-accent-green-110/30 bg-accent-green-110/5 p-3 text-center transition-colors hover:border-accent-green-110 hover:bg-accent-green-110/10 sm:order-2 sm:border-white-10 sm:bg-transparent"
      >
        <Zap className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100"><span className="sm:hidden">Quick Create</span><span className="hidden sm:inline">Single Post</span></span>
        <span className="text-[11px] text-white-40">Create one post right now</span>
        <span className="text-[10px] text-white-30 italic">Best when you need something to post today.</span>
      </button>
    </div>
  );
}
