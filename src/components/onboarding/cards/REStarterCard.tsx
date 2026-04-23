'use client';

import { cn } from '@/lib/utils';
import { RE_INTENTS } from '@/lib/onboarding/configs/realEstate';
import type { REIntent } from '@/lib/onboarding/types';
import { Home, Building2, Sparkles, SlidersHorizontal } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Building2,
  Sparkles,
};

interface Props {
  onSelect: (intent: REIntent, label: string) => void;
}

export function REStarterCard({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {RE_INTENTS.map((def) => {
        const IconComponent = ICON_MAP[def.icon] ?? Home;
        return (
          <button
            key={def.intent}
            onClick={() => onSelect(def.intent, def.label)}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg text-left',
              'border transition-all cursor-pointer',
              def.emphasized
                ? 'bg-accent-green-110/5 hover:bg-accent-green-110/10 border-accent-green-110/20 hover:border-accent-green-110/40'
                : 'bg-white-5 hover:bg-white-10 border-transparent hover:border-accent-green-110/30',
            )}
          >
            <div className="flex-none mt-0.5">
              <IconComponent className={cn(
                'w-5 h-5',
                def.emphasized ? 'text-accent-green-110' : 'text-accent-green-110',
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm font-medium',
                def.emphasized ? 'text-white-100' : 'text-white-90',
              )}>
                {def.label}
              </p>
              <p className="text-xs text-white-40 mt-0.5">{def.description}</p>
            </div>
          </button>
        );
      })}

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
