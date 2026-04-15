'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROGRESS_STEPS = [
  'Analyzing your assets',
  'Choosing the best post opportunities',
  'Building your weekly plan',
  'Scheduling your first content',
];

// Min time per step so it doesn't flash too fast
const STEP_MIN_MS = 1200;

interface Props {
  /** True while the plan-week mutation is pending */
  isPending: boolean;
  /** Set once the mutation succeeds */
  result: { generated: number; scheduled: number } | null;
  /** Called when the user dismisses the success state */
  onDone: () => void;
}

export function FirstWeekProgress({ isPending, result, onDone }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  // Auto-advance through steps while pending
  useEffect(() => {
    if (!isPending) return;
    setActiveStep(0);
    setShowSuccess(false);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < PROGRESS_STEPS.length) {
        setActiveStep(step);
      }
    }, STEP_MIN_MS);

    return () => clearInterval(interval);
  }, [isPending]);

  // When result arrives, jump to final step then show success
  useEffect(() => {
    if (!result) return;
    setActiveStep(PROGRESS_STEPS.length - 1);
    const timer = setTimeout(() => setShowSuccess(true), 800);
    return () => clearTimeout(timer);
  }, [result]);

  if (!isPending && !result) return null;

  return (
    <div className="rounded-2xl border border-accent-green-110/20 bg-gradient-to-br from-accent-green-110/5 via-transparent to-transparent p-6 space-y-5">
      {showSuccess && result ? (
        <div className="text-center space-y-3 py-2">
          <div className="w-12 h-12 rounded-full bg-accent-green-110/15 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-accent-green-110" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white-100">
              Your first week is planned
            </h3>
            <p className="text-sm text-white-50 mt-1">
              {result.generated} draft{result.generated !== 1 ? 's' : ''} created
              {result.scheduled > 0 &&
                `, ${result.scheduled} scheduled`}
              . Review them below and publish when ready.
            </p>
          </div>
          <button
            onClick={onDone}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-accent-green-110 text-sp-dark hover:bg-accent-green-110/90 transition-colors"
          >
            View My Plan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-white-100">
            Planning your first week...
          </h3>
          <div className="space-y-3">
            {PROGRESS_STEPS.map((label, i) => {
              const isDone = i < activeStep || (result && i <= activeStep);
              const isActive = i === activeStep && !result;

              return (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors',
                      isDone
                        ? 'bg-accent-green-110/20'
                        : isActive
                          ? 'bg-accent-green-110/10'
                          : 'bg-white-5'
                    )}
                  >
                    {isDone ? (
                      <Check className="w-3 h-3 text-accent-green-110" />
                    ) : isActive ? (
                      <Loader2 className="w-3 h-3 text-accent-green-110 animate-spin" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-white-20" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      isDone
                        ? 'text-accent-green-110/80'
                        : isActive
                          ? 'text-white-100'
                          : 'text-white-30'
                    )}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
