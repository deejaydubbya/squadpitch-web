'use client';

import { useState } from 'react';
import {
  X,
  Zap,
  Loader2,
  ChevronLeft,
  Check,
  AlertCircle,
  Calendar,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAutopilotPreview,
  useAutopilotExecute,
  useBlueprints,
  type Channel,
  type AutopilotSuggestion,
} from '@/hooks/useSquadpitch';

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'X', label: 'X' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'YOUTUBE', label: 'YouTube' },
];

type Step = 'configure' | 'review' | 'results';

interface Props {
  clientId: string;
  onClose: () => void;
}

export function AutopilotPanel({ clientId, onClose }: Props) {
  const [step, setStep] = useState<Step>('configure');

  // Configure state
  const [channel, setChannel] = useState<Channel | undefined>(undefined);
  const [count, setCount] = useState(5);

  // Review state
  const [suggestions, setSuggestions] = useState<AutopilotSuggestion[]>([]);
  const [autoSchedule, setAutoSchedule] = useState(false);

  // Results state
  const [results, setResults] = useState<{
    results: Array<{ dataItemId: string; status: string; draftId?: string }>;
    generated: number;
    total: number;
    scheduled: number;
  } | null>(null);

  const preview = useAutopilotPreview(clientId);
  const execute = useAutopilotExecute(clientId);
  const { data: blueprints } = useBlueprints({});

  const handlePreview = async () => {
    const result = await preview.mutateAsync({
      count,
      channel,
      excludeDataItemIds: [],
    });
    setSuggestions(result.suggestions);
    setStep('review');
  };

  const handleRemoveSuggestion = (rank: number) => {
    setSuggestions((prev) => prev.filter((s) => s.rank !== rank));
  };

  const handleBlueprintChange = (rank: number, blueprintId: string) => {
    if (!blueprints) return;
    const bp = blueprints.find((b) => b.id === blueprintId);
    if (!bp) return;
    setSuggestions((prev) =>
      prev.map((s) =>
        s.rank === rank
          ? {
              ...s,
              blueprint: {
                id: bp.id,
                slug: bp.slug,
                name: bp.name,
                category: bp.category,
              },
              autoSelected: false,
            }
          : s
      )
    );
  };

  const handleExecute = async () => {
    const result = await execute.mutateAsync({
      channel,
      autoSchedule,
      suggestions: suggestions.map((s) => ({
        dataItem: { id: s.dataItem.id },
        blueprint: { id: s.blueprint.id },
      })),
    });
    setResults(result);
    setStep('results');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-sp-surface border border-white-10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white-10 bg-sp-surface rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent-green-110" />
            <h2 className="text-lg font-bold text-white-100">Autopilot</h2>
            <span className="px-2 py-0.5 rounded-full bg-white-10 text-white-40 text-xs font-medium">
              {step === 'configure'
                ? 'Step 1/3'
                : step === 'review'
                  ? 'Step 2/3'
                  : 'Done'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white-10 transition-colors"
          >
            <X className="w-4 h-4 text-white-40" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Step 1: Configure ── */}
          {step === 'configure' && (
            <>
              <p className="text-sm text-white-60">
                Autopilot analyzes your business data and picks the best
                data + blueprint combinations. Review before generating.
              </p>

              {/* Channel selector */}
              <div>
                <label className="block text-xs font-medium text-white-60 mb-2">
                  Channel (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setChannel(undefined)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                      !channel
                        ? 'bg-accent-green-110 text-sp-surface'
                        : 'bg-white-10 text-white-60 hover:bg-white-20'
                    )}
                  >
                    All
                  </button>
                  {CHANNELS.map((ch) => (
                    <button
                      key={ch.value}
                      onClick={() => setChannel(ch.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                        channel === ch.value
                          ? 'bg-accent-green-110 text-sp-surface'
                          : 'bg-white-10 text-white-60 hover:bg-white-20'
                      )}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Count input */}
              <div>
                <label className="block text-xs font-medium text-white-60 mb-2">
                  Number of suggestions (1-20)
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={(e) =>
                    setCount(
                      Math.max(1, Math.min(20, parseInt(e.target.value) || 1))
                    )
                  }
                  className="w-24 px-3 py-2 rounded-lg bg-white-5 border border-white-10 text-white-100 text-sm focus:outline-none focus:border-accent-green-110"
                />
              </div>

              <button
                onClick={handlePreview}
                disabled={preview.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
              >
                {preview.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate Suggestions
              </button>

              {preview.isError && (
                <p className="text-red-400 text-xs">
                  Failed to generate suggestions. Try again.
                </p>
              )}
            </>
          )}

          {/* ── Step 2: Review ── */}
          {step === 'review' && (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('configure')}
                  className="p-1 rounded-lg hover:bg-white-10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white-40" />
                </button>
                <p className="text-sm text-white-60">
                  {suggestions.length} suggestion
                  {suggestions.length !== 1 ? 's' : ''} — remove or swap
                  blueprints, then execute.
                </p>
              </div>

              {suggestions.length === 0 ? (
                <p className="text-white-40 text-sm text-center py-8">
                  No suggestions remaining. Go back and try different settings.
                </p>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((s) => (
                    <div
                      key={s.rank}
                      className="flex gap-3 p-4 rounded-xl bg-white-5 border border-white-10"
                    >
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white-10 text-white-40 text-xs font-bold flex-shrink-0">
                        {s.rank}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white-100 truncate">
                              {s.dataItem.title}
                            </p>
                            <p className="text-xs text-white-40">
                              {s.dataItem.type.replace(/_/g, ' ')} — Score:{' '}
                              {Math.round(s.adjustedScore)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {s.autoSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-accent-green-110/10 text-accent-green-110 text-[10px] font-semibold">
                                Auto-selected
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveSuggestion(s.rank)}
                              className="p-1 rounded hover:bg-white-10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-white-30 hover:text-red-400" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-white-40 italic">
                          {s.reasoning}
                        </p>

                        {/* Blueprint selector */}
                        <div>
                          <label className="block text-[10px] font-medium text-white-30 mb-1">
                            Blueprint
                          </label>
                          <select
                            value={s.blueprint.id}
                            onChange={(e) =>
                              handleBlueprintChange(s.rank, e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg bg-white-5 border border-white-10 text-white-100 text-xs focus:outline-none focus:border-accent-green-110"
                          >
                            <option value={s.blueprint.id}>
                              {s.blueprint.name}
                            </option>
                            {blueprints
                              ?.filter((b) => b.id !== s.blueprint.id)
                              .map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Auto-schedule toggle */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white-5 border border-white-10">
                <button
                  onClick={() => setAutoSchedule(!autoSchedule)}
                  className={cn(
                    'mt-0.5 w-9 h-5 rounded-full transition-colors flex-shrink-0 relative',
                    autoSchedule ? 'bg-accent-green-110' : 'bg-white-20'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                      autoSchedule ? 'translate-x-4' : 'translate-x-0.5'
                    )}
                  />
                </button>
                <div>
                  <p className="text-sm font-medium text-white-100 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Auto-schedule
                  </p>
                  <p className="text-xs text-white-40 mt-0.5">
                    Automatically approve and schedule drafts across the next 7
                    days at optimal posting times (max 2/day).
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setStep('configure')}
                  className="px-4 py-2.5 rounded-xl bg-white-10 text-white-60 text-sm font-medium hover:bg-white-20 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleExecute}
                  disabled={execute.isPending || suggestions.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
                >
                  {execute.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Execute ({suggestions.length} draft
                  {suggestions.length !== 1 ? 's' : ''})
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Results ── */}
          {step === 'results' && results && (
            <>
              <div className="text-center space-y-3 py-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-accent-green-110/10 flex items-center justify-center">
                  <Check className="w-6 h-6 text-accent-green-110" />
                </div>
                <h3 className="text-lg font-bold text-white-100">
                  Autopilot Complete
                </h3>
                <p className="text-sm text-white-60">
                  Generated {results.generated} of {results.total} draft
                  {results.total !== 1 ? 's' : ''}
                  {results.scheduled > 0 &&
                    ` — ${results.scheduled} scheduled`}
                </p>
              </div>

              <div className="space-y-2">
                {results.results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white-5 border border-white-10"
                  >
                    {r.status === 'success' ? (
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <span className="text-xs text-white-60 truncate">
                      {r.dataItemId}
                    </span>
                    <span
                      className={cn(
                        'ml-auto text-xs font-medium',
                        r.status === 'success'
                          ? 'text-green-400'
                          : r.status === 'limit_reached'
                            ? 'text-yellow-400'
                            : 'text-red-400'
                      )}
                    >
                      {r.status === 'success'
                        ? 'Created'
                        : r.status === 'limit_reached'
                          ? 'Limit reached'
                          : 'Error'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
