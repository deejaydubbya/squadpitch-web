'use client';

import { X, RefreshCw, FileText, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PlannerSuggestion } from '@/hooks/useSquadpitch';
import { AngleBadge } from './AngleBadge';
import { WhyThis, generateReasons } from './WhyThis';

interface Props {
  suggestion: PlannerSuggestion;
  onCreateDraft: (suggestion: PlannerSuggestion) => void;
  onSchedule: (suggestion: PlannerSuggestion) => void;
  onSwap: (suggestion: PlannerSuggestion) => void;
  onDismiss: (suggestion: PlannerSuggestion) => void;
  isSwapping?: boolean;
  isCreating?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function SuggestionCard({
  suggestion,
  onCreateDraft,
  onSchedule,
  onSwap,
  onDismiss,
  isSwapping,
  isCreating,
}: Props) {
  const score = Math.round(suggestion.adjustedScore);

  const reasons = generateReasons({
    reasoning: suggestion.reasoning,
    angleLabel: suggestion.angleLabel,
    score: suggestion.adjustedScore,
  });

  return (
    <div className="card border-l-2 border-l-accent-green-110/40 border-dashed">
      <div className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-accent-green-110/60 font-medium">
              Suggested for {formatDate(suggestion.suggestedDate)}
            </p>
            <h4 className="text-sm font-semibold text-white-100 mt-0.5 truncate">
              {suggestion.dataItem.title}
            </h4>
          </div>
          <button
            onClick={() => onDismiss(suggestion)}
            className="p-1 rounded hover:bg-white-10 text-white-40 hover:text-white-80 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badges row: channel → angle → type → blueprint */}
        <div className="flex items-center gap-2 flex-wrap">
          {suggestion.channel && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-white-5 border-white-10 text-white-60">
              {suggestion.channel}
            </span>
          )}
          <AngleBadge
            angleKey={suggestion.angle}
            angleLabel={suggestion.angleLabel}
            angleCategory={suggestion.angleCategory}
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-white-5 border-white-10 text-white-60 uppercase tracking-wider">
            {suggestion.dataItem.type}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded border bg-white-5 border-white-10 text-white-60">
            {suggestion.blueprint.name}
          </span>
        </div>

        {/* Confidence score */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white-10 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                score >= 70 ? 'bg-accent-green-110' : score >= 40 ? 'bg-amber-400' : 'bg-white-40'
              )}
              style={{ width: `${Math.min(100, score)}%` }}
            />
          </div>
          <span className="text-[10px] text-white-40 tabular-nums w-6 text-right">{score}</span>
        </div>

        {/* Why this? */}
        <WhyThis reasons={reasons} defaultExpanded />

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onCreateDraft(suggestion)}
            disabled={isCreating}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              'bg-accent-green-110 text-sp-dark hover:bg-accent-green-110/90',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isCreating ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FileText className="w-3 h-3" />
            )}
            Create Draft
          </button>
          <button
            onClick={() => onSchedule(suggestion)}
            disabled={isCreating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-80 hover:bg-white-15 transition-colors disabled:opacity-50"
          >
            <Calendar className="w-3 h-3" />
            Schedule
          </button>
          <button
            onClick={() => onSwap(suggestion)}
            disabled={isSwapping}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white-10 text-white-80 hover:bg-white-15 transition-colors disabled:opacity-50"
          >
            {isSwapping ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Swap
          </button>
        </div>
      </div>
    </div>
  );
}
