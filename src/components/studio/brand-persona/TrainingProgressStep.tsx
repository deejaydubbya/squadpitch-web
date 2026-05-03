'use client';

import { useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PersonaTrainingStatus } from '@/hooks/useSquadpitch';

interface Props {
  status: PersonaTrainingStatus;
  progress: number;
  errorMessage: string | null;
  onRetry: () => void;
  retrying: boolean;
}

const PHASE_MAP: Record<string, { label: string; minProgress: number }[]> = {
  QUEUED: [
    { label: 'Submitting training job...', minProgress: 0 },
  ],
  TRAINING: [
    { label: 'Queued — waiting for GPU...', minProgress: 0 },
    { label: 'Preparing dataset...', minProgress: 15 },
    { label: 'Training AI persona...', minProgress: 30 },
    { label: 'Finalizing model...', minProgress: 70 },
    { label: 'Generating previews...', minProgress: 85 },
  ],
  COMPLETED: [
    { label: 'Complete!', minProgress: 0 },
  ],
};

function getPhases(status: PersonaTrainingStatus, progress: number) {
  const phases = PHASE_MAP[status] || PHASE_MAP.TRAINING;
  return phases.map((p) => ({
    ...p,
    isDone: progress > p.minProgress + 15 || status === 'COMPLETED',
    isCurrent:
      status !== 'COMPLETED' &&
      progress >= p.minProgress &&
      progress < p.minProgress + 15,
  }));
}

export function TrainingProgressStep({
  status,
  progress,
  errorMessage,
  onRetry,
  retrying,
}: Props) {
  const isComplete = status === 'COMPLETED';
  const isFailed = status === 'FAILED';
  const displayProgress = Math.min(100, Math.max(0, progress ?? 0));
  const phases = getPhases(status, displayProgress);

  // Failed state
  if (isFailed) {
    return (
      <div className="space-y-6 text-center py-8">
        <div>
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white-100">Training Failed</h2>
          <p className="text-sm text-white-40 mt-1">
            {errorMessage || 'Something went wrong during training.'}
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="btn btn-primary px-6 py-2 text-sm"
          >
            <RotateCcw className="w-4 h-4 mr-1.5 inline" />
            {retrying ? 'Retrying...' : 'Retry Training'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-center py-8">
      <div>
        <h2 className="text-lg font-semibold text-white-100">
          {isComplete ? 'Training Complete' : 'Training Your AI Brand Persona'}
        </h2>
        <p className="text-sm text-white-40 mt-1">
          {isComplete
            ? 'Your persona is ready to use.'
            : 'This may take a few minutes. You can keep using Squadpitch — we\'ll notify you when it\'s done.'}
        </p>
      </div>

      {/* Progress circle */}
      <div className="flex justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-white-10"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - displayProgress / 100)}`}
              className="text-accent-green-110 transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isComplete ? (
              <CheckCircle className="w-10 h-10 text-accent-green-110" />
            ) : (
              <span className="text-2xl font-bold text-white-100">
                {displayProgress}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Phase list */}
      <div className="max-w-xs mx-auto space-y-3">
        {phases.map((phase) => (
          <div
            key={phase.label}
            className={cn(
              'flex items-center gap-3 text-sm transition-opacity',
              phase.isDone || isComplete
                ? 'text-accent-green-110'
                : phase.isCurrent
                  ? 'text-white-100'
                  : 'text-white-20'
            )}
          >
            {phase.isDone || isComplete ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : phase.isCurrent ? (
              <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
            ) : (
              <div className="w-4 h-4 flex-shrink-0 rounded-full border border-white-15" />
            )}
            {phase.label}
          </div>
        ))}
      </div>
    </div>
  );
}
