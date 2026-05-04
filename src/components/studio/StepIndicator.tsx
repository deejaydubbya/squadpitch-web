'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepDef {
  key: string;
  label: string;
  description: string;
}

interface Props {
  steps: StepDef[];
  currentStep: string;
}

export function StepIndicator({ steps, currentStep }: Props) {
  const currentIdx = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-0">
        {steps.map((step, i) => {
          const isActive = i === currentIdx;
          const isCompleted = i < currentIdx;
          return (
            <div key={step.key} className="flex items-center">
              {/* Circle */}
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors',
                  isCompleted
                    ? 'bg-accent-green-110 text-sp-surface'
                    : isActive
                      ? 'bg-accent-green-110 text-sp-surface'
                      : 'bg-white-10 text-white-40 border border-white-20'
                )}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium ml-1.5 hidden sm:inline',
                  isActive ? 'text-white-100' : isCompleted ? 'text-accent-green-110' : 'text-white-30'
                )}
              >
                {step.label}
              </span>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 sm:w-12 h-px mx-2',
                    i < currentIdx ? 'bg-accent-green-110' : 'bg-white-10'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      {/* Current step description */}
      {currentIdx >= 0 && (
        <p className="text-xs text-white-40 mt-2">{steps[currentIdx].description}</p>
      )}
    </div>
  );
}
