'use client';

import { cn } from '@/lib/utils';
import { Zap, Check } from 'lucide-react';
import { useOnboardingEngine } from '@/hooks/useOnboardingEngine';
import { OnboardingMessageThread } from './OnboardingMessageThread';
import { getCompletenessScore } from '@/lib/onboarding/engine';

const PHASE_LABELS: Record<string, string> = {
  industry_select: 'Start',
  quick_start: 'Source',
  analysis: 'Analyze',
  value_delivery: 'Create',
  profile_refinement: 'Profile',
  enrichment: 'Connect',
  completion: 'Done',
};

const PHASE_ORDER = ['industry_select', 'quick_start', 'analysis', 'value_delivery', 'profile_refinement', 'enrichment', 'completion'];

export function OnboardingShell() {
  const engine = useOnboardingEngine();
  const score = getCompletenessScore(engine.session);
  const currentIdx = PHASE_ORDER.indexOf(engine.session.phase);
  const isEarlyPhase = currentIdx <= 1;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] max-w-5xl mx-auto">
      {/* Header — shown prominently at start, collapses once user progresses */}
      <div className="flex-none px-4 sm:px-6 pt-5 pb-1">
        {isEarlyPhase && (
          <div className="mb-4 text-center sm:text-left">
            <h1 className="text-lg sm:text-xl font-semibold text-white-90 leading-snug">
              Create your first ready-to-post campaign
            </h1>
            <p className="mt-1 text-sm text-white-40 max-w-xl leading-relaxed">
              Give Squadpitch a listing, website, or business details. We&apos;ll extract the
              important data, learn your voice, and generate your first posts.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent-green-110/10 text-accent-green-110 border border-accent-green-110/20">
              <Zap className="w-3 h-3" />
              Usually 2–3 minutes
            </span>
          </div>
        )}

        {/* Progress steps */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {PHASE_ORDER.map((phase, idx) => {
            const isComplete = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={phase} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'h-1.5 w-full rounded-full transition-all duration-300',
                    isComplete
                      ? 'bg-accent-green-110'
                      : isCurrent
                        ? 'bg-accent-green-110/60 shadow-[0_0_6px_rgba(74,222,128,0.25)]'
                        : 'bg-white-5',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] sm:text-[11px] font-medium transition-colors hidden sm:block',
                    isComplete
                      ? 'text-accent-green-110'
                      : isCurrent
                        ? 'text-white-70'
                        : 'text-white-20',
                  )}
                >
                  {isComplete ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" />
                      {PHASE_LABELS[phase]}
                    </span>
                  ) : (
                    PHASE_LABELS[phase]
                  )}
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
