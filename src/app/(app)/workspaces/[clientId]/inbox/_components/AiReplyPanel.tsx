'use client';

// AI reply panel — generates a single draft suggestion based on the
// most recent inbound message. Never auto-sends; "Use this" hands
// the body back to the parent so it can pre-fill the composer and
// stamp fromSuggestionId on the next manual-log call.

import { useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import {
  useGenerateAiReply,
  type InboxAiSuggestion,
  type ReplyTone,
} from '@/hooks/useInbox';
import { ApiError } from '@/lib/apiFetch';
import { cn } from '@/lib/utils';

const TONES: { value: ReplyTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
];

interface AiReplyPanelProps {
  clientId: string;
  conversationId: string;
  latestSuggestion: InboxAiSuggestion | null;
  onUseSuggestion: (suggestion: InboxAiSuggestion) => void;
  /** Disabled when there's no inbound message to reply to. */
  disabled?: boolean;
}

export function AiReplyPanel({
  clientId,
  conversationId,
  latestSuggestion,
  onUseSuggestion,
  disabled = false,
}: AiReplyPanelProps) {
  const [tone, setTone] = useState<ReplyTone>('professional');
  const [copied, setCopied] = useState(false);
  const generate = useGenerateAiReply(clientId, conversationId);

  // The mutation result is the freshest suggestion; fall back to the
  // server-rendered latest one (e.g. on first load).
  const suggestion: InboxAiSuggestion | null =
    generate.data?.suggestion ?? latestSuggestion;

  const errorMessage =
    generate.error instanceof ApiError ? generate.error.message : null;

  const handleCopy = async () => {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked — silently ignore; the user can select+copy.
    }
  };

  return (
    <div className="card p-3 space-y-3 bg-white-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-accent-green-110" />
        <span className="text-xs font-semibold text-white-90 uppercase tracking-wider">
          AI reply
        </span>
        <div className="ml-auto flex items-center gap-1">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTone(t.value)}
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded transition-colors uppercase tracking-wider',
                tone === t.value
                  ? 'bg-accent-green-110/15 text-accent-green-110'
                  : 'text-white-40 hover:text-white-80',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!suggestion && (
        <div className="text-xs text-white-50 leading-relaxed">
          Generate a draft reply tailored to this lead. Nothing is sent — you
          decide whether to use it.
        </div>
      )}

      {suggestion && (
        <div className="bg-sp-bg border border-white-10 rounded-lg p-3 space-y-2">
          <p className="text-sm text-white-90 whitespace-pre-wrap leading-relaxed">
            {suggestion.body}
          </p>
          <div className="flex items-center gap-1 pt-1 border-t border-white-10">
            <button
              type="button"
              onClick={() => onUseSuggestion(suggestion)}
              className="text-xs font-medium px-2.5 py-1 rounded bg-accent-green-110/15 text-accent-green-110 hover:bg-accent-green-110/25"
            >
              Use this
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium px-2.5 py-1 rounded text-white-70 hover:bg-white-10 inline-flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
            <span className="ml-auto text-[10px] text-white-30">
              {suggestion.tone ?? tone}
            </span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 text-xs text-amber-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <button
        type="button"
        onClick={() => generate.mutate({ tone })}
        disabled={disabled || generate.isPending}
        className={cn(
          'w-full text-xs font-medium px-3 py-2 rounded-lg border transition-colors',
          'border-white-15 text-white-80 hover:text-white-100 hover:bg-white-10',
          (disabled || generate.isPending) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {generate.isPending
          ? 'Generating…'
          : suggestion
            ? 'Generate another'
            : 'Suggest a reply'}
      </button>

      {disabled && (
        <p className="text-[10px] text-white-40">
          Waiting for an inbound message — nothing to reply to yet.
        </p>
      )}
    </div>
  );
}
