'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VersionPickerProps } from './types';

function getScoreReason(version: VersionPickerProps['versions'][number]): string {
  const breakdown = version.score?.breakdown;
  if (!breakdown?.length) return '';
  const val = version.score?.value ?? 0;
  if (val >= 6) {
    const pos = breakdown.find((b) => b.isPositive);
    return pos?.label ?? '';
  }
  const neg = breakdown.find((b) => !b.isPositive);
  return neg?.label ?? '';
}

function getRecommendationReason(
  versions: VersionPickerProps['versions'],
  bestVersionId: string,
): string {
  if (versions.length < 2) return '';
  const best = versions.find((v) => v.id === bestVersionId);
  const others = versions.filter((v) => v.id !== bestVersionId);
  if (!best?.score) return '';

  const bestBreakdown = best.score.breakdown;
  const strengths: string[] = [];

  for (const item of bestBreakdown) {
    if (!item.isPositive) continue;
    // Check if this dimension is stronger than all other versions
    const isBetter = others.every((other) => {
      const otherItem = other.score?.breakdown.find((b) => b.label.split(' ')[0] === item.label.split(' ')[0]);
      return !otherItem || item.points > otherItem.points;
    });
    if (isBetter) strengths.push(item.label.split(' — ')[0].toLowerCase());
  }

  if (strengths.length === 0) return 'Has the highest overall score';
  return `Stronger ${strengths.slice(0, 2).join(' and ')}`;
}

export function VersionPicker({
  versions,
  selectedId,
  bestVersionId,
  onSelect,
}: VersionPickerProps) {
  const [expanded, setExpanded] = useState(false);

  if (versions.length <= 1) return null;

  const selected = versions.find((v) => v.id === selectedId) ?? versions[0];
  const isBest = selectedId === bestVersionId;
  const altCount = versions.length - 1;
  const recReason = getRecommendationReason(versions, bestVersionId);

  return (
    <div className="rounded-lg bg-white-5 border border-white-10 overflow-hidden">
      {/* Collapsed: selected version summary */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white-5 transition-colors"
      >
        <Check className="w-3 h-3 text-accent-green-110 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-white-80 flex items-center gap-1">
          {selected.label.startsWith('AI') && <Sparkles className="w-2.5 h-2.5 text-accent-green-110" />}
          {selected.label}
        </span>
        {selected.score && (
          <span className={cn(
            'text-[10px] font-bold tabular-nums',
            (selected.score.value) >= 8 ? 'text-accent-green-110' :
            (selected.score.value) >= 6 ? 'text-accent-green-110/70' :
            (selected.score.value) >= 3 ? 'text-accent-orange' : 'text-accent-red'
          )}>
            {selected.score.value}/{selected.score.max}
          </span>
        )}
        {isBest && (
          <span className="flex items-center gap-0.5 text-[9px] font-medium text-accent-green-110 bg-accent-green-110/10 px-1.5 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" />
            Recommended
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-white-40">
          {expanded ? 'Hide' : `View ${altCount} alternative${altCount > 1 ? 's' : ''}`}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
      </button>

      {/* Recommendation reason */}
      {!expanded && recReason && (
        <div className="px-3 pb-1.5 -mt-1">
          <span className="text-[10px] text-white-40 italic">
            {isBest ? recReason : `Try ${versions.find((v) => v.id === bestVersionId)?.label ?? 'recommended'} — ${recReason.toLowerCase()}`}
          </span>
        </div>
      )}

      {/* Expanded: all versions */}
      {expanded && (
        <div className="border-t border-white-10">
          {versions.map((v) => {
            const isSelected = v.id === selectedId;
            const isVersionBest = v.id === bestVersionId;
            const reason = getScoreReason(v);

            return (
              <div
                key={v.id}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 transition-colors',
                  isSelected ? 'bg-accent-green-110/5' : 'hover:bg-white-5',
                )}
              >
                <span className="text-[11px] font-semibold text-white-80 min-w-[70px] flex items-center gap-1">
                  {v.label.startsWith('AI') && <Sparkles className="w-2.5 h-2.5 text-accent-green-110" />}
                  {v.label}
                </span>
                {v.score && (
                  <span className={cn(
                    'text-[10px] font-bold tabular-nums',
                    v.score.value >= 8 ? 'text-accent-green-110' :
                    v.score.value >= 6 ? 'text-accent-green-110/70' :
                    v.score.value >= 3 ? 'text-accent-orange' : 'text-accent-red'
                  )}>
                    {v.score.value}/{v.score.max}
                  </span>
                )}
                {reason && (
                  <span className="text-[10px] text-white-40 truncate">{reason}</span>
                )}
                {isVersionBest && (
                  <span className="flex items-center gap-0.5 text-[9px] font-medium text-accent-green-110 bg-accent-green-110/10 px-1.5 py-0.5 rounded-full flex-shrink-0"
                    title={recReason}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Recommended
                  </span>
                )}
                <span className="ml-auto flex-shrink-0">
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-accent-green-110" />
                  ) : (
                    <button
                      onClick={() => {
                        onSelect(v.id);
                        setExpanded(false);
                      }}
                      className="text-[10px] font-medium text-white-40 hover:text-white-80 px-2 py-0.5 rounded border border-white-10 hover:border-white-20 transition-colors"
                    >
                      Select
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
