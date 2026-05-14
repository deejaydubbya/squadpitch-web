'use client';

// AI reply panel — generates a single draft suggestion based on the
// most recent inbound message. Never auto-sends; "Use this" hands
// the body back to the parent so it can pre-fill the composer and
// stamp fromSuggestionId on the next manual-log call.

import { useState } from 'react';
import { Sparkles, Copy, Check, AlertCircle, RotateCw } from 'lucide-react';
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
    <div className="card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-green-110/15 text-accent-green-110 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white-100">AI reply assistant</h3>
          <p className="text-[11px] text-white-50 mt-0.5 leading-snug">
            Draft a response using the lead&apos;s form answers and your brand
            voice.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] text-white-40 uppercase tracking-wider mr-1">
          Tone
        </span>
        {TONES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTone(t.value)}
            disabled={disabled}
            className={cn(
              'text-[11px] font-medium px-2 py-1 rounded border transition-colors',
              tone === t.value
                ? 'bg-accent-green-110/15 text-accent-green-110 border-accent-green-110/30'
                : 'border-white-10 text-white-60 hover:text-white-100 hover:border-white-20',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {suggestion && (
        <div className="bg-sp-bg border border-white-10 rounded-lg p-3 space-y-3">
          <p className="text-sm text-white-90 whitespace-pre-wrap leading-relaxed">
            {suggestion.body}
          </p>
          <div className="flex items-center gap-1 pt-2 border-t border-white-10">
            <button
              type="button"
              onClick={() => onUseSuggestion(suggestion)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-accent-green-110 text-sp-bg hover:bg-accent-green-100 inline-flex items-center gap-1.5"
            >
              <Check className="w-3 h-3" />
              Use this
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium px-2.5 py-1.5 rounded-md text-white-70 hover:bg-white-10 inline-flex items-center gap-1.5"
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
            <button
              type="button"
              onClick={() => generate.mutate({ tone })}
              disabled={generate.isPending}
              className={cn(
                'text-xs font-medium px-2.5 py-1.5 rounded-md text-white-70 hover:bg-white-10 inline-flex items-center gap-1.5 ml-auto',
                generate.isPending && 'opacity-50 cursor-not-allowed',
              )}
            >
              <RotateCw
                className={cn('w-3 h-3', generate.isPending && 'animate-spin')}
              />
              {generate.isPending ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-400/5 border border-amber-400/20 rounded-lg p-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!suggestion && (
        <button
          type="button"
          onClick={() => generate.mutate({ tone })}
          disabled={disabled || generate.isPending}
          className={cn(
            'w-full text-xs font-semibold px-3 py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors',
            'bg-accent-green-110 text-sp-bg hover:bg-accent-green-100',
            (disabled || generate.isPending) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {generate.isPending ? 'Generating…' : 'Suggest reply'}
        </button>
      )}

      <p className="text-[10px] text-white-40 leading-snug">
        Nothing is sent automatically — &quot;Use this&quot; populates the
        composer so you can review before logging.
        {disabled && ' Waiting for an inbound message to reply to.'}
      </p>
    </div>
  );
}
