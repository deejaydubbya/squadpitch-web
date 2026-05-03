'use client';

import { cn } from '@/lib/utils';
import { WIZARD_STEPS, type WizardStepId } from './personaConstants';
import type { PersonaType } from '@/hooks/useSquadpitch';

interface Props {
  currentStep: WizardStepId;
  personaType?: PersonaType;
}

export function WizardStepIndicator({ currentStep, personaType }: Props) {
  // Only show style_profile step for BRAND_STYLE personas
  const steps = WIZARD_STEPS.filter(
    (s) => s.id !== 'style_profile' || personaType === 'BRAND_STYLE'
  );
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  isCompleted && 'bg-accent-green-110',
                  isCurrent && 'bg-accent-green-110 ring-2 ring-accent-green-110/30',
                  !isCompleted && !isCurrent && 'bg-white-15'
                )}
              />
              <span
                className={cn(
                  'text-[11px] font-medium hidden sm:inline',
                  isCurrent ? 'text-white-100' : 'text-white-30'
                )}
              >
                {step.shortLabel}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'w-6 h-px',
                  i < currentIdx ? 'bg-accent-green-110' : 'bg-white-10'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
