'use client';

import { cn } from '@/lib/utils';
import { getOnboardingConfig } from '@/lib/onboarding/configRegistry';
import { INDUSTRY_ICON_MAP } from '@/lib/onboarding/helpers';
import type { StarterMethod } from '@/lib/onboarding/types';
import { Globe, MessageSquare, Sparkles, Home, Briefcase } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  MessageSquare,
  Sparkles,
  Home,
  Briefcase,
};

interface Props {
  industryKey: string | null;
  onSelect: (method: StarterMethod, label: string) => void;
}

export function StarterOptionsCard({ industryKey, onSelect }: Props) {
  const config = getOnboardingConfig(industryKey);

  return (
    <div className="flex flex-col gap-2">
      {config.starters.map((starter) => {
        const IconComponent = ICON_MAP[starter.icon] ?? Briefcase;
        return (
          <button
            key={starter.method}
            onClick={() => onSelect(starter.method, starter.label)}
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
              <p className="text-sm font-medium text-white-90">{starter.label}</p>
              <p className="text-xs text-white-40 mt-0.5">{starter.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
