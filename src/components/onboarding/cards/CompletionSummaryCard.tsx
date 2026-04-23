'use client';

import { cn } from '@/lib/utils';
import type { OnboardingSessionState } from '@/lib/onboarding/types';
import { getCompletenessScore } from '@/lib/onboarding/engine';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface Props {
  session: OnboardingSessionState;
  onFinish: () => void;
}

export function CompletionSummaryCard({ session, onFinish }: Props) {
  const score = getCompletenessScore(session);

  const items = [
    { label: 'Industry selected', done: !!session.industryKey },
    { label: 'Business analyzed', done: !!session.analyzeResult },
    { label: 'Brand profile created', done: session.brandConfirmed },
    { label: 'Workspace created', done: !!session.createdClientId },
    { label: 'Sample posts generated', done: session.previewDrafts.length > 0 },
    { label: 'Additional sources added', done: session.enrichmentsCompleted.length > 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <circle
              className="text-white-10"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              cx="18"
              cy="18"
              r="15.5"
            />
            <circle
              className="text-accent-green-110"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
              fill="none"
              cx="18"
              cy="18"
              r="15.5"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white-80">
            {score}%
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-white-90">Setup complete!</p>
          <p className="text-xs text-white-40">Your workspace is ready to use</p>
        </div>
      </div>

      {/* Checklist */}
      <div className="flex flex-col gap-1.5">
        {items.map(({ label, done }) => (
          <div key={label} className="flex items-center gap-2">
            <CheckCircle2
              className={cn(
                'w-4 h-4 flex-none',
                done ? 'text-accent-green-110' : 'text-white-20',
              )}
            />
            <span className={cn('text-xs', done ? 'text-white-70' : 'text-white-30')}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onFinish}
        className={cn(
          'flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold',
          'bg-accent-green-110 text-white hover:bg-accent-green-120 cursor-pointer transition-all',
        )}
      >
        Go to workspace
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
