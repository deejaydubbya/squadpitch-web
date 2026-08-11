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
  completion: 'Campaign',
};

const PHASE_ORDER = ['industry_select', 'quick_start', 'analysis', 'value_delivery', 'profile_refinement', 'enrichment', 'completion'];

export function OnboardingShell() {
  const engine = useOnboardingEngine();
  const score = getCompletenessScore(engine.session);
  const currentIdx = PHASE_ORDER.indexOf(engine.session.phase);
  const isEarlyPhase = currentIdx <= 1;

  // Resume / Start over prompt — shown when a previous in-flight
  // onboarding session is found in localStorage. The user picks; we
  // never auto-rehydrate.
  if (engine.pendingResume) {
    const savedPhaseLabel = PHASE_LABELS[engine.pendingResume.phase] ?? 'In progress';
    return (
      <div className="onboarding-mobile flex min-h-dvh flex-col justify-center px-4 py-6 sm:px-6 sm:py-12">
        <div className="card mx-auto w-full max-w-3xl p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white-100">
            Pick up where you left off?
          </h2>
          <p className="mt-1 text-sm text-white-60">
            We saved your previous setup so you don&apos;t have to start
            from scratch.{' '}
            <span className="text-white-80">Step: {savedPhaseLabel}</span>
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={engine.resumeFromSaved}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-accent-green-110 px-4 py-2 text-sm font-semibold text-sp-bg transition-colors hover:bg-accent-green-120 sm:w-auto"
            >
              <Check className="w-4 h-4" />
              Resume setup
            </button>
            <button
              type="button"
              onClick={engine.startOver}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-white-10 bg-white-5 px-4 py-2 text-sm font-medium text-white-80 transition-colors hover:bg-white-10 sm:w-auto"
            >
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-mobile mx-auto flex h-dvh max-h-dvh w-full max-w-5xl flex-col overflow-hidden">
      {/* Header — shown prominently at start, collapses once user progresses */}
      <div className="safe-area-top z-20 flex-none border-b border-white-5 bg-sp-bg/95 px-4 pb-2 pt-4 backdrop-blur sm:px-6 sm:pt-5">
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
        <div
          className="flex items-center gap-0.5 sm:gap-1"
          role="progressbar"
          aria-label="Onboarding progress"
          aria-valuemin={1}
          aria-valuemax={PHASE_ORDER.length}
          aria-valuenow={Math.max(1, currentIdx + 1)}
          aria-valuetext={`${PHASE_LABELS[engine.session.phase] ?? 'Setup'}, step ${Math.max(1, currentIdx + 1)} of ${PHASE_ORDER.length}`}
        >
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
        <p className="mt-2 text-center text-xs font-medium text-white-60 sm:hidden">
          {PHASE_LABELS[engine.session.phase] ?? 'Setup'} · Step {Math.max(1, currentIdx + 1)} of {PHASE_ORDER.length}
        </p>
      </div>

      {/* Message thread */}
      <OnboardingMessageThread engine={engine} />
    </div>
  );
}
