'use client';

import { Sparkles, Compass, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onPlanFirstWeek: () => void;
  onStartTour: () => void;
  onDismiss: () => void;
  isPlanningWeek?: boolean;
}

export function PlannerWelcomeCard({
  onPlanFirstWeek,
  onStartTour,
  onDismiss,
  isPlanningWeek,
}: Props) {
  return (
    <div className="relative rounded-2xl border border-accent-green-110/20 bg-gradient-to-br from-accent-green-110/5 via-transparent to-transparent p-6">
      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-white-30 hover:text-white-60 hover:bg-white-10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="space-y-3 max-w-lg">
        <h2 className="text-base font-semibold text-white-100">
          Welcome to your Planner
        </h2>
        <p className="text-sm text-white-50 leading-relaxed">
          Your planner turns listings and business assets into a weekly marketing
          plan. We analyze your content, pick the best opportunities, and
          schedule posts across your channels.
        </p>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onPlanFirstWeek}
            disabled={isPlanningWeek}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              'bg-accent-green-110 text-sp-dark hover:bg-accent-green-110/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Sparkles className="w-4 h-4" />
            Plan My First Week
          </button>
          <button
            onClick={onStartTour}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white-10 text-white-60 hover:bg-white-15 hover:text-white-80 transition-colors"
          >
            <Compass className="w-4 h-4" />
            Take Quick Tour
          </button>
        </div>
      </div>
    </div>
  );
}
