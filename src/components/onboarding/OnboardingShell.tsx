'use client';

import { cn } from '@/lib/utils';
import { useOnboardingEngine } from '@/hooks/useOnboardingEngine';
import { OnboardingMessageThread } from './OnboardingMessageThread';
import { getCompletenessScore } from '@/lib/onboarding/engine';

const PHASE_LABELS: Record<string, string> = {
  industry_select: 'Industry',
  quick_start: 'Getting Started',
  analysis: 'Analyzing',
  value_delivery: 'Preview',
  profile_refinement: 'Profile',
  enrichment: 'Enhance',
  completion: 'Done',
};

const PHASE_ORDER = ['industry_select', 'quick_start', 'analysis', 'value_delivery', 'profile_refinement', 'enrichment', 'completion'];

export function OnboardingShell() {
  const engine = useOnboardingEngine();
  const score = getCompletenessScore(engine.session);
  const currentIdx = PHASE_ORDER.indexOf(engine.session.phase);

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] max-w-3xl mx-auto">
      {/* Progress bar */}
      <div className="flex-none px-4 pt-4 pb-2">
        <div className="flex items-center gap-1">
          {PHASE_ORDER.map((phase, idx) => {
            const isComplete = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={phase} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'h-1 w-full rounded-full transition-colors',
                    isComplete ? 'bg-accent-green-110' : isCurrent ? 'bg-accent-green-110/50' : 'bg-white-5',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] transition-colors',
                    isComplete || isCurrent ? 'text-white-60' : 'text-white-20',
                  )}
                >
                  {PHASE_LABELS[phase]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message thread */}
      <OnboardingMessageThread engine={engine} />
    </div>
  );
}
