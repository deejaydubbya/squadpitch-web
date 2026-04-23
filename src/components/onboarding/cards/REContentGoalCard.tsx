'use client';

import { cn } from '@/lib/utils';
import { RE_CONTENT_GOALS } from '@/lib/onboarding/configs/realEstate';
import type { REContentGoal } from '@/lib/onboarding/types';
import { TrendingUp, Users, Award, Heart, Sparkles } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Users,
  Award,
  Heart,
  Sparkles,
};

interface Props {
  onSelect: (goal: REContentGoal, label: string) => void;
}

export function REContentGoalCard({ onSelect }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {RE_CONTENT_GOALS.map(({ goal, label, description, icon }) => {
        const IconComponent = ICON_MAP[icon] ?? Sparkles;
        return (
          <button
            key={goal}
            onClick={() => onSelect(goal, label)}
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
              <p className="text-sm font-medium text-white-90">{label}</p>
              <p className="text-xs text-white-40 mt-0.5">{description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
