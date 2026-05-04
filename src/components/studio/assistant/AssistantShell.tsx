'use client';

import { useAssistant } from '@/hooks/useAssistant';
import { useClient } from '@/hooks/useSquadpitch';
import { isStepSkippable } from '@/lib/assistant/workflowConfig';
import { AssistantProgress } from './AssistantProgress';
import { AssistantNav } from './AssistantNav';
import { StepRenderer } from './StepRenderer';
import { RotateCcw } from 'lucide-react';

interface Props {
  clientId: string;
}

export function AssistantShell({ clientId }: Props) {
  const { data: client } = useClient(clientId);
  const {
    session,
    dispatch,
    steps,
    currentStepId,
    currentStepIndex,
    canAdvance,
    canGoBack,
    progress,
    reset,
    nextStep,
    prevStep,
  } = useAssistant(clientId, client?.industryKey ?? undefined);

  const currentStep = steps[currentStepIndex] ?? null;
  const isSkippable = currentStepId ? isStepSkippable(currentStepId, session) : false;

  return (
    <div className="flex flex-col h-full min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white-100">Create</h1>
        {session.mode && (
          <button
            onClick={reset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white-40 hover:text-white-100 hover:bg-white-5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Start over
          </button>
        )}
      </div>

      {/* Progress */}
      <AssistantProgress steps={steps} currentStepIndex={currentStepIndex} session={session} />

      {/* Step card */}
      <div className="flex-1 bg-sp-card rounded-xl border border-white-10 p-6 min-h-[400px] flex flex-col">
        {currentStep && (
          <h2 className="text-lg font-semibold text-white-100 mb-4">{currentStep.label}</h2>
        )}
        <div className="flex-1">
          <StepRenderer
            currentStepId={currentStepId}
            session={session}
            dispatch={dispatch}
            clientId={clientId}
          />
        </div>
      </div>

      {/* Navigation — hidden on generate step (it has its own actions) */}
      {session.mode && currentStepId !== 'generate' && (
        <AssistantNav
          canAdvance={canAdvance}
          canGoBack={canGoBack}
          isSkippable={isSkippable}
          onNext={nextStep}
          onBack={prevStep}
        />
      )}
    </div>
  );
}
