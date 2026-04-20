'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Image,
  Calendar,
  Radio,
  Layers,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInlineAction } from '@/hooks/useInlineAction';
import { useChannelSettings, type Draft, type Channel } from '@/hooks/useSquadpitch';
import { generateOptimizations, generateDraftOptimizations } from '@/lib/optimizations/engine';
import type {
  OptimizationSuggestion,
  OptimizationCategory,
  InlineActionPayload,
} from '@/lib/optimizations/types';

// ── Category icons ───────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<OptimizationCategory, typeof Sparkles> = {
  caption: Sparkles,
  media: Image,
  schedule: Calendar,
  channel: Radio,
  campaign_structure: Layers,
};

const CATEGORY_COLORS: Record<OptimizationCategory, string> = {
  caption: 'text-purple-400 bg-purple-400/15',
  media: 'text-blue-400 bg-blue-400/15',
  schedule: 'text-orange-400 bg-orange-400/15',
  channel: 'text-green-400 bg-green-400/15',
  campaign_structure: 'text-yellow-400 bg-yellow-400/15',
};

const BASIS_LABEL: Record<string, string> = {
  heuristic: 'Best practice',
  performance_data: 'Based on your data',
};

// ── Campaign-level suggestions ───────────────────────────────────────────

interface CampaignOptimizationsProps {
  drafts: Draft[];
  campaignId: string;
  campaignType?: string | null;
  clientId: string;
}

export function CampaignOptimizations({
  drafts,
  campaignId,
  campaignType,
  clientId,
}: CampaignOptimizationsProps) {
  const { data: channels } = useChannelSettings(clientId);
  const connectedChannels: Channel[] = channels
    ?.filter((c) => c.isEnabled)
    .map((c) => c.channel) ?? [];

  const suggestions = useMemo(
    () => generateOptimizations({ drafts, campaignId, campaignType, connectedChannels, clientId }),
    [drafts, campaignId, campaignType, connectedChannels, clientId],
  );

  if (suggestions.length === 0) return null;

  return (
    <SuggestionsPanel suggestions={suggestions} clientId={clientId} />
  );
}

// ── Draft-level suggestions ──────────────────────────────────────────────

interface DraftOptimizationsProps {
  draft: Draft;
}

export function DraftOptimizations({ draft }: DraftOptimizationsProps) {
  const { data: channels } = useChannelSettings(draft.clientId);
  const connectedChannels: Channel[] = channels
    ?.filter((c) => c.isEnabled)
    .map((c) => c.channel) ?? [];

  const suggestions = useMemo(
    () => generateDraftOptimizations(draft, connectedChannels),
    [draft, connectedChannels],
  );

  if (suggestions.length === 0) return null;

  return (
    <SuggestionsPanel suggestions={suggestions} clientId={draft.clientId} compact />
  );
}

// ── Shared panel ─────────────────────────────────────────────────────────

interface SuggestionsPanelProps {
  suggestions: OptimizationSuggestion[];
  clientId: string;
  compact?: boolean;
}

function SuggestionsPanel({ suggestions, clientId, compact = false }: SuggestionsPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(!compact);

  const visible = suggestions.filter((s) => !dismissedIds.has(s.id));
  if (visible.length === 0) return null;

  return (
    <div className={cn(
      'rounded-xl border border-white-10',
      compact ? 'bg-white-5/50' : 'bg-gradient-to-br from-purple-500/5 via-transparent to-transparent border-purple-500/20',
    )}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left"
      >
        <Lightbulb className={cn('w-3.5 h-3.5', compact ? 'text-white-40' : 'text-purple-400')} />
        <span className={cn('text-xs font-semibold uppercase tracking-wider', compact ? 'text-white-60' : 'text-white-100')}>
          {compact ? 'Tips' : 'Optimization Suggestions'}
        </span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400">
          {visible.length}
        </span>
        <div className="ml-auto">
          {expanded ? <ChevronUp className="w-3 h-3 text-white-40" /> : <ChevronDown className="w-3 h-3 text-white-40" />}
        </div>
      </button>

      {/* Suggestions list */}
      {expanded && (
        <div className={cn('px-4 pb-3 space-y-2', compact && 'pt-0')}>
          {visible.map((suggestion) => (
            <SuggestionItem
              key={suggestion.id}
              suggestion={suggestion}
              clientId={clientId}
              compact={compact}
              onDismiss={() => setDismissedIds((prev) => { const next = new Set(prev); next.add(suggestion.id); return next; })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Individual suggestion ────────────────────────────────────────────────

interface SuggestionItemProps {
  suggestion: OptimizationSuggestion;
  clientId: string;
  compact?: boolean;
  onDismiss: () => void;
}

function SuggestionItem({ suggestion, clientId, compact = false, onDismiss }: SuggestionItemProps) {
  const router = useRouter();
  const inlineAction = useInlineAction();
  const [showReasoning, setShowReasoning] = useState(false);
  const [applied, setApplied] = useState(false);

  const CategoryIcon = CATEGORY_ICONS[suggestion.category] ?? Lightbulb;
  const colorClass = CATEGORY_COLORS[suggestion.category] ?? 'text-white-60 bg-white-10';

  const handleApply = () => {
    switch (suggestion.applyAction) {
      case 'inline_action': {
        const payload = suggestion.applyPayload as InlineActionPayload;
        const draftId = suggestion.targetDraftIds[0];
        if (!draftId) break;
        inlineAction.mutate(
          { type: payload.actionType as never, draftId, clientId, params: payload.params },
          { onSuccess: () => setApplied(true) },
        );
        break;
      }
      case 'navigate': {
        const payload = suggestion.applyPayload as { type: 'navigate'; href: string };
        router.push(payload.href);
        break;
      }
      default:
        // For reorder_media, reschedule, generate — mark as applied (backend handles)
        setApplied(true);
        break;
    }
  };

  if (applied) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-400 text-xs">
        <Check className="w-3 h-3" />
        <span>{suggestion.title} — applied</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white-5 border border-white-10 hover:border-white-20 transition-colors">
      <div className="flex items-start gap-2.5 px-3 py-2.5">
        {/* Category icon */}
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', colorClass)}>
          <CategoryIcon className="w-3.5 h-3.5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-white-100">{suggestion.title}</p>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white-10 text-white-40">
              {BASIS_LABEL[suggestion.basis]}
            </span>
          </div>
          {!compact && (
            <p className="text-[11px] text-white-40 mt-0.5 leading-relaxed">
              {suggestion.description}
            </p>
          )}

          {/* Reasoning toggle */}
          {showReasoning && (
            <p className="text-[11px] text-white-50 mt-1 leading-relaxed italic">
              {suggestion.reasoning}
            </p>
          )}

          {/* Actions row */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleApply}
              disabled={inlineAction.isPending}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-accent-green-110/10 text-accent-green-110 text-[11px] font-semibold hover:bg-accent-green-110/20 transition-colors disabled:opacity-50"
            >
              {inlineAction.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Apply
            </button>
            <button
              onClick={() => setShowReasoning((v) => !v)}
              className="text-[11px] text-white-40 hover:text-white-60 transition-colors"
            >
              {showReasoning ? 'Hide why' : 'Why?'}
            </button>
            <button
              onClick={onDismiss}
              className="ml-auto text-white-30 hover:text-white-60 transition-colors"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
