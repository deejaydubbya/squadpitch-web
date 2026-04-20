'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  CopyPlus,
  Palette,
  Maximize2,
  Clock,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInlineAction } from '@/hooks/useInlineAction';
import { useUpdateDraft, useScheduleDraft, type Draft } from '@/hooks/useSquadpitch';
import { usePreferencesContext } from '@/hooks/useContentPreferences';
import { getActionsForStatus } from '@/lib/inlineActions/registry';
import type { InlineActionConfig, InlineActionType } from '@/lib/inlineActions/types';

const ICON_MAP: Record<string, typeof Sparkles> = {
  RefreshCw,
  CopyPlus,
  Sparkles,
  Palette,
  Maximize2,
  Clock,
};

type Phase = 'menu' | 'params' | 'loading' | 'result';

interface Props {
  draft: Draft;
}

export function InlineActionsMenu({ draft }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('menu');
  const [selectedAction, setSelectedAction] = useState<InlineActionConfig | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const menuRef = useRef<HTMLDivElement>(null);

  const inlineAction = useInlineAction();
  const updateDraft = useUpdateDraft(draft.id);
  const scheduleDraft = useScheduleDraft(draft.id);
  const preferencesContext = usePreferencesContext(draft.clientId);

  const actions = getActionsForStatus(draft.status);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleClose() {
    setOpen(false);
    setPhase('menu');
    setSelectedAction(null);
    setParamValues({});
    inlineAction.reset();
  }

  function handleSelectAction(action: InlineActionConfig) {
    setSelectedAction(action);
    if (action.params && action.params.length > 0) {
      setPhase('params');
    } else {
      executeAction(action, {});
    }
  }

  function handleParamsSubmit() {
    if (!selectedAction) return;
    executeAction(selectedAction, paramValues);
  }

  function executeAction(action: InlineActionConfig, params: Record<string, string>) {
    setPhase('loading');
    inlineAction.mutate(
      { type: action.type, draftId: draft.id, clientId: draft.clientId, params, preferencesContext },
      {
        onSuccess: () => setPhase('result'),
        onError: () => setPhase('result'),
      }
    );
  }

  function handleApply() {
    const preview = inlineAction.data?.preview;
    if (!preview) return;
    updateDraft.mutate(
      { body: preview.body, hooks: preview.hooks, hashtags: preview.hashtags, cta: preview.cta },
      { onSuccess: handleClose }
    );
  }

  function handleScheduleApply() {
    const schedule = inlineAction.data?.suggestedSchedule;
    if (!schedule) return;
    scheduleDraft.mutate(schedule.scheduledFor, { onSuccess: handleClose });
  }

  if (actions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-white-60 hover:text-white-100 flex items-center gap-1"
        title="AI Actions"
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 bg-sp-card rounded-xl border border-white-10 p-4 shadow-xl min-w-[260px]">
          {phase === 'menu' && (
            <div className="space-y-1">
              <p className="text-[11px] text-white-40 uppercase tracking-wide mb-2">AI Actions</p>
              {actions.map((action) => {
                const Icon = ICON_MAP[action.icon] ?? Sparkles;
                return (
                  <button
                    key={action.type}
                    onClick={() => handleSelectAction(action)}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white-10 flex items-center gap-2 text-xs text-white-80 hover:text-white-100 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <div>
                      <span className="font-medium">{action.label}</span>
                      <span className="text-white-40 ml-1.5">{action.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {phase === 'params' && selectedAction?.params && (
            <div className="space-y-3">
              <p className="text-[11px] text-white-40 uppercase tracking-wide">
                {selectedAction.label}
              </p>
              {selectedAction.params.map((param) => (
                <div key={param.key}>
                  <label className="text-xs text-white-60 block mb-1">{param.label}</label>
                  <select
                    value={paramValues[param.key] ?? ''}
                    onChange={(e) =>
                      setParamValues((prev) => ({ ...prev, [param.key]: e.target.value }))
                    }
                    className="w-full bg-white-5 border border-white-10 rounded-lg px-2 py-1.5 text-xs text-white-80 focus:outline-none focus:border-white-20"
                  >
                    <option value="">Select...</option>
                    {param.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setPhase('menu'); setSelectedAction(null); setParamValues({}); }}
                  className="text-xs text-white-40 hover:text-white-60 px-2 py-1"
                >
                  Back
                </button>
                <button
                  onClick={handleParamsSubmit}
                  disabled={selectedAction.params.some(
                    (p) => p.required !== false && !paramValues[p.key]
                  )}
                  className="text-xs px-3 py-1 rounded-lg bg-white-10 text-white-80 hover:bg-white-20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Go
                </button>
              </div>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex items-center gap-2 py-4 justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-white-40" />
              <span className="text-xs text-white-40">
                {selectedAction?.type === 'optimize_schedule' ? 'Computing...' : 'Generating...'}
              </span>
            </div>
          )}

          {phase === 'result' && (
            <div className="space-y-3">
              {inlineAction.isError && (
                <div className="text-xs text-accent-red">
                  {inlineAction.error?.message ?? 'Something went wrong'}
                  <button
                    onClick={handleClose}
                    className="block mt-2 text-white-40 hover:text-white-60"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {inlineAction.isSuccess && inlineAction.data.outputMode === 'replace' && inlineAction.data.preview && (
                <div>
                  <p className="text-[11px] text-white-40 uppercase tracking-wide mb-2">Preview</p>
                  <p className="text-xs text-white-80 whitespace-pre-wrap max-h-[200px] overflow-y-auto leading-relaxed">
                    {inlineAction.data.preview.body}
                  </p>
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={handleApply}
                      disabled={updateDraft.isPending}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zone-green/20 text-zone-green hover:bg-zone-green/30 flex items-center gap-1 disabled:opacity-50"
                    >
                      {updateDraft.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Apply
                    </button>
                    <button
                      onClick={handleClose}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white-10 text-white-60 hover:bg-white-20 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Discard
                    </button>
                  </div>
                </div>
              )}

              {inlineAction.isSuccess && inlineAction.data.outputMode === 'duplicate' && (
                <div className="text-center py-2">
                  <p className="text-xs text-white-80">
                    {inlineAction.data.newDraftIds?.length ?? 3} variations created
                  </p>
                  <button
                    onClick={handleClose}
                    className="text-xs text-white-40 hover:text-white-60 mt-2"
                  >
                    Done
                  </button>
                </div>
              )}

              {inlineAction.isSuccess && inlineAction.data.outputMode === 'preview' && inlineAction.data.suggestedSchedule && (
                <div>
                  <p className="text-[11px] text-white-40 uppercase tracking-wide mb-2">Suggested Time</p>
                  <p className="text-xs text-white-80">
                    {new Date(inlineAction.data.suggestedSchedule.scheduledFor).toLocaleString()}
                  </p>
                  <p className="text-[11px] text-white-40 mt-1">
                    {inlineAction.data.suggestedSchedule.reason}
                  </p>
                  <div className="flex gap-2 pt-3">
                    <button
                      onClick={handleScheduleApply}
                      disabled={scheduleDraft.isPending}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zone-blue/20 text-zone-blue hover:bg-zone-blue/30 flex items-center gap-1 disabled:opacity-50"
                    >
                      {scheduleDraft.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      Schedule
                    </button>
                    <button
                      onClick={handleClose}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white-10 text-white-60 hover:bg-white-20 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
