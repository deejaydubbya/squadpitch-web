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
        <span className="text-[11px] text-white-40">Multi-post sequence</span>
      </button>

      <button
        onClick={() => onSelection({ type: 'SET_MODE', payload: 'quick_post' }, 'Mode: Quick Post')}
        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-white-10 hover:border-accent-green-110 hover:bg-accent-green-110/5 transition-colors text-center"
      >
        <Zap className="w-5 h-5 text-accent-green-110" />
        <span className="text-xs font-medium text-white-100">Quick Post</span>
        <span className="text-[11px] text-white-40">Single post</span>
      </button>
    </div>
  );
}
