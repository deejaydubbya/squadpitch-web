'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HooksRankingProps } from './types';

export function HooksRanking({ hooks, hasScored, onUseHook }: HooksRankingProps) {
  if (hooks.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-white-40 uppercase tracking-wider">
          {hasScored ? 'Hooks — ranked by quality' : 'Hooks'}
        </label>
        <span className="text-[10px] text-white-30">Click to use as opening line</span>
      </div>
      <div className="space-y-1">
        {hooks.map((hook, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onUseHook(hook.text)}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-accent-green-110/5 transition-colors group"
          >
            <div className="flex items-start gap-2">
              {hasScored ? (
                <span
                  className={cn(
                    'text-xs font-bold tabular-nums min-w-[20px] text-center',
                    hook.hookScore >= 8
                      ? 'text-accent-green-110'
                      : hook.hookScore >= 6
                        ? 'text-accent-orange'
                        : 'text-white-40'
                  )}
                >
                  {hook.hookScore}
                </span>
              ) : (
                <span className="text-white-30 text-xs min-w-[20px] text-center">
                  {i + 1}.
                </span>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white-80 group-hover:text-accent-green-110 transition-colors">
                  {hook.text}
                </span>
                {hook.reason && (
                  <p className="text-[10px] text-white-30 mt-0.5">{hook.reason}</p>
                )}
              </div>
              <Zap className="w-3 h-3 text-white-20 group-hover:text-accent-green-110 flex-shrink-0 mt-0.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
