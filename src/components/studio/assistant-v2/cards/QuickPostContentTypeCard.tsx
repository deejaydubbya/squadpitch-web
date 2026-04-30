'use client';

import { cn } from '@/lib/utils';
import type { AssistantAction } from '@/lib/assistant/types';
import { CONTENT_TYPES } from './quickPostConstants';

interface Props {
  onSelection: (action: AssistantAction, confirmationText: string) => void;
}

export function QuickPostContentTypeCard({ onSelection }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CONTENT_TYPES.map((ct) => {
        const Icon = ct.icon;
        return (
          <button
            key={ct.value}
            type="button"
            onClick={() =>
              onSelection(
                { type: 'SET_QUICK_POST_CONTENT_TYPE', payload: ct.value },
                `Content type: ${ct.label}`
              )
            }
            className={cn(
              'px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1',
              'bg-white-10 text-white-60 hover:bg-accent-green-110 hover:text-sp-surface'
            )}
          >
            <Icon className="w-3 h-3" />
            {ct.label}
          </button>
        );
      })}
    </div>
  );
}
