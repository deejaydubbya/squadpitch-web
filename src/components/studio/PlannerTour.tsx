'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const TOUR_STEPS = [
  {
    target: '[data-tour-step="calendar"]',
    title: 'Your marketing calendar',
    description:
      'Each day shows your scheduled, published, and suggested posts. Click a day to filter the draft list below.',
  },
  {
    target: '[data-tour-step="week-summary"]',
    title: 'Weekly progress',
    description:
      'We track how close you are to your posting target and show which content angles are missing.',
  },
  {
    target: '[data-tour-step="plan-week"]',
    title: 'One-click planning',
    description:
      'Plan My Week analyzes your assets, picks the best opportunities, and fills your calendar automatically.',
  },
  {
    target: '[data-tour-step="draft-list"]',
    title: 'Edit, schedule, or swap',
    description:
      'Click any post to expand it. Approve, schedule, or publish directly from here.',
  },
];

interface Props {
  active: boolean;
  onComplete: () => void;
}

export function PlannerTour({ active, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = useCallback(() => {
    const selector = TOUR_STEPS[step]?.target;
    if (!selector) return;
    const el = document.querySelector(selector);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    const handle = () => updateRect();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [active, updateRect]);

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  // Position tooltip below target, centered
  const tooltipStyle: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.bottom + 12,
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 336)),
        zIndex: 60,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
      };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onComplete}
      />

      {/* Highlight ring */}
      {rect && (
        <div
          className="fixed z-50 rounded-xl ring-2 ring-accent-green-110 ring-offset-2 ring-offset-sp-dark pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="w-80 rounded-xl bg-sp-surface border border-white-10 shadow-2xl shadow-black/40 p-4 space-y-3"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-accent-green-110 font-medium">
              Step {step + 1} of {TOUR_STEPS.length}
            </p>
            <h3 className="text-sm font-semibold text-white-100 mt-0.5">
              {current.title}
            </h3>
          </div>
          <button
            onClick={onComplete}
            className="p-1 rounded hover:bg-white-10 text-white-40 hover:text-white-80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-white-50 leading-relaxed">
          {current.description}
        </p>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1 text-xs text-white-40 hover:text-white-60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Back
          </button>

          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-colors',
                  i === step ? 'bg-accent-green-110' : 'bg-white-20'
                )}
              />
            ))}
          </div>

          {isLast ? (
            <button
              onClick={onComplete}
              className="text-xs font-medium text-accent-green-110 hover:text-accent-green-110/80 transition-colors"
            >
              Done
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 text-xs font-medium text-accent-green-110 hover:text-accent-green-110/80 transition-colors"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
