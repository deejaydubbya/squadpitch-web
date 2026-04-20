'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStep, AssistantSessionState } from '@/lib/assistant/types';
import { isStepComplete, getStepLabel } from '@/lib/assistant/workflowConfig';

interface Props {
  steps: WorkflowStep[];
  currentStepIndex: number;
  session: AssistantSessionState;
}

export function AssistantProgress({ steps, currentStepIndex, session }: Props) {
  if (steps.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto">
      {steps.map((step, idx) => {
        const completed = idx < currentStepIndex || isStepComplete(step.id, session);
        const isCurrent = idx === currentStepIndex;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  'w-6 h-px flex-shrink-0',
                  completed ? 'bg-accent-green-110' : 'bg-white-10'
                )}
              />
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border',
                  completed
                    ? 'border-accent-green-110 bg-accent-green-110 text-white-100'
                    : isCurrent
                      ? 'border-accent-green-110 bg-accent-green-110/20 text-accent-green-110'
                      : 'border-white-10 text-white-40'
                )}
              >
                {completed ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span
                className={cn(
                  'hidden sm:inline text-xs font-medium',
                  isCurrent ? 'text-white-100' : completed ? 'text-white-60' : 'text-white-40'
                )}
              >
                {getStepLabel(step, session.industryKey)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
