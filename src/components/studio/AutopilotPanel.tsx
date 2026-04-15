'use client';

import { useState } from 'react';
import {
  X,
  Zap,
  Loader2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Check,
  AlertCircle,
  Trash2,
  Sparkles,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useAutopilotPreview,
  useAutopilotExecute,
  useAutopilotSettings,
  useUpdateAutopilotSettings,
  useBlueprints,
  useBusinessDataLabels,
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
  const bdLabels = useBusinessDataLabels(clientId);
  const { data: apSettings } = useAutopilotSettings(clientId);
  const updateSettings = useUpdateAutopilotSettings(clientId);
  const [showSettings, setShowSettings] = useState(false);
  const [step, setStep] = useState<Step>('configure');

  // Configure state
  const [channel, setChannel] = useState<Channel | undefined>(undefined);
  const [count, setCount] = useState(1);

  // Review state
  const [suggestions, setSuggestions] = useState<AutopilotSuggestion[]>([]);

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
      autoSchedule: false,
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
              <div className="space-y-1.5">
                <p className="text-sm text-white-60">
                  Autopilot reviews your {bdLabels.itemPlural.toLowerCase()} and
                  creates draft post ideas for the best content opportunities.
                </p>
                <p className="text-xs text-white-30">
                  All output is saved as drafts for your review — nothing is
                  published automatically.
                </p>
              </div>

              {/* Settings section */}
              <div className="rounded-xl border border-white-10 overflow-hidden">
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-xs font-medium text-white-60 hover:bg-white-5 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="flex-1 text-left">Settings</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${apSettings?.enabled ? 'bg-accent-green-110' : 'bg-white-20'}`} />
                    <span className="text-white-30">{apSettings?.enabled ? 'On' : 'Off'}</span>
                  </span>
                  {showSettings ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {showSettings && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white-10">
                    {/* Enable/disable */}
                    <div className="flex items-center justify-between pt-3">
                      <div>
                        <p className="text-xs font-medium text-white-100">Enable Autopilot</p>
                        <p className="text-[10px] text-white-30 mt-0.5">Auto-create drafts when opportunities arise</p>
                      </div>
                      <button
                        onClick={() => updateSettings.mutate({
                          enabled: !apSettings?.enabled,
                          mode: !apSettings?.enabled ? 'draft_assist' : 'off',
                        })}
                        disabled={updateSettings.isPending}
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          apSettings?.enabled ? 'bg-accent-green-110' : 'bg-white-20'
                        }`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          apSettings?.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    {/* Max drafts per week */}
                    <div>
                      <label className="block text-xs font-medium text-white-60 mb-2">
                        Max drafts per week
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 3, 5, 7, 10].map((n) => (
                          <button
                            key={n}
                            onClick={() => updateSettings.mutate({ maxDraftsPerWeek: n })}
                            disabled={updateSettings.isPending}
                            className={cn(
                              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                              (apSettings?.maxDraftsPerWeek ?? 3) === n
                                ? 'bg-accent-green-110 text-sp-surface'
                                : 'bg-white-5 border border-white-10 text-white-60 hover:bg-white-10'
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preferred channels */}
                    <div>
                      <label className="block text-xs font-medium text-white-60 mb-2">
                        Preferred channels
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {CHANNELS.map((ch) => {
                          const selected = apSettings?.preferredChannels?.includes(ch.value) ?? false;
                          return (
                            <button
                              key={ch.value}
                              onClick={() => {
                                const current = apSettings?.preferredChannels ?? [];
                                const next = selected
                                  ? current.filter((c) => c !== ch.value)
                                  : [...current, ch.value];
                                updateSettings.mutate({ preferredChannels: next });
                              }}
                              disabled={updateSettings.isPending}
                              className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                                selected
                                  ? 'bg-accent-green-110 text-sp-surface'
                                  : 'bg-white-5 border border-white-10 text-white-60 hover:bg-white-10'
                              )}
                            >
                              {ch.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

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

              {/* Count selector */}
              <div>
                <label className="block text-xs font-medium text-white-60 mb-2">
                  Drafts to generate
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={cn(
                        'w-10 h-10 rounded-lg text-sm font-semibold transition-colors',
                        count === n
                          ? 'bg-accent-green-110 text-sp-surface'
                          : 'bg-white-5 border border-white-10 text-white-60 hover:bg-white-10'
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePreview}
                disabled={preview.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-green-110 text-sp-surface font-semibold text-sm hover:bg-accent-green-120 transition-colors disabled:opacity-50"
              >
                {preview.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing content opportunities...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Find Opportunities
                  </>
                )}
              </button>

              {preview.isError && (
                <p className="text-red-400 text-xs">
                  Failed to find opportunities. Try again.
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
                  {suggestions.length} draft idea
                  {suggestions.length !== 1 ? 's' : ''} found — review and
                  adjust, then create drafts.
                </p>
              </div>

              {suggestions.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-white-40 text-sm">
                    No strong opportunities found right now.
                  </p>
                  <p className="text-white-30 text-xs">
                    Try a different channel or add more data to your workspace.
                  </p>
                </div>
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
                              {s.dataItem.type.replace(/_/g, ' ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {s.autoSelected && (
                              <span className="px-1.5 py-0.5 rounded bg-accent-green-110/10 text-accent-green-110 text-[10px] font-semibold">
                                Best match
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

                        {/* Content style selector */}
                        <div>
                          <label className="block text-[10px] font-medium text-white-30 mb-1">
                            Content style
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

              {/* Draft-only notice */}
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-white-5 border border-white-10">
                <FileText className="w-4 h-4 text-white-30 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white-40">
                  Drafts are created for your review. Nothing is published or
                  scheduled until you approve it.
                </p>
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating drafts...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Create {suggestions.length} Draft
                      {suggestions.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Step 3: Results ── */}
          {step === 'results' && results && (
            <>
              <div className="text-center space-y-3 py-4">
                <div
                  className={cn(
                    'mx-auto w-12 h-12 rounded-full flex items-center justify-center',
                    results.generated > 0
                      ? 'bg-accent-green-110/10'
                      : 'bg-white-10'
                  )}
                >
                  {results.generated > 0 ? (
                    <Check className="w-6 h-6 text-accent-green-110" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-white-40" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-white-100">
                  {results.generated > 0
                    ? `Created ${results.generated} Draft${results.generated !== 1 ? 's' : ''}`
                    : 'No Drafts Created'}
                </h3>
                <p className="text-sm text-white-60">
                  {results.generated > 0
                    ? 'Saved as drafts for your review. You can edit, approve, or schedule them from the library.'
                    : 'Autopilot could not generate drafts this time. Try different settings or add more data.'}
                </p>
              </div>

              {results.generated > 0 && (
                <div className="space-y-2">
                  {results.results.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white-5 border border-white-10"
                    >
                      {r.status === 'success' ? (
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      ) : r.status === 'limit_reached' ? (
                        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      )}
                      <span className="text-xs text-white-60 flex-1">
                        {r.status === 'success'
                          ? 'Draft created'
                          : r.status === 'limit_reached'
                            ? 'Usage limit reached'
                            : 'Generation failed'}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          r.status === 'success'
                            ? 'text-green-400'
                            : r.status === 'limit_reached'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        )}
                      >
                        {r.status === 'success'
                          ? 'Saved'
                          : r.status === 'limit_reached'
                            ? 'Skipped'
                            : 'Error'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

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
