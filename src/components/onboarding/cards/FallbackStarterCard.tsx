'use client';

import { cn } from '@/lib/utils';
import { FALLBACK_INTENTS } from '@/lib/onboarding/configs/fallback';
import type { FallbackIntent } from '@/lib/onboarding/types';
import { Building2, ShoppingBag, Sparkles, SlidersHorizontal } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  ShoppingBag,
  Sparkles,
};

interface Props {
  onSelect: (intent: FallbackIntent, label: string) => void;
}

export function FallbackStarterCard({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {FALLBACK_INTENTS.map((def) => {
        const IconComponent = ICON_MAP[def.icon] ?? Building2;
        return (
          <button
            key={def.intent}
            onClick={() => onSelect(def.intent, def.label)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg text-left',
              'bg-white-5 hover:bg-white-10 border border-transparent hover:border-accent-green-110/30',
              'transition-all cursor-pointer',
            )}
          >
            <div className="flex-none mt-0.5">
              <IconComponent className="w-5 h-5 text-accent-green-110" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white-90">{def.label}</p>
              <p className="text-xs text-white-40 mt-0.5">{def.description}</p>
            </div>
          </button>
        );
      })}

      {/* Secondary action: manual entry */}
      <button
        onClick={() => onSelect('manual', 'Enter everything manually')}
        className="flex items-center justify-center gap-1.5 py-2 text-xs text-white-40 hover:text-white-60 transition-colors cursor-pointer"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Enter everything manually
      </button>
    </div>
  );
}
