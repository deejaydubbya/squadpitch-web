'use client';

// AI reply panel — generates a single draft suggestion based on the
// most recent inbound message. Never auto-sends; "Use this" hands
// the body back to the parent so it can pre-fill the composer and
// stamp fromSuggestionId on the next manual-log call.
//
// After "Use this" the panel collapses to a compact strip so the
// full suggestion text isn't shown twice (once here, once in the
// composer). The parent controls the collapsed flag so it can be
// reset when the external reply is logged.

import { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  RotateCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useGenerateAiReply,
  type AiReplyChannel,
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
  /** Short label describing the context the AI will use (page / campaign /
   *  property). Renders as a "Using context:" line so the user can trust
   *  the suggestion is grounded. Omit when there is no source context. */
  contextLabel?: string | null;
  /** Which composer surface the user is about to fill — drives the
   *  AI prompt framing. "email" gets a full reply, "note" gets a
   *  third-person team note. */
  channel?: AiReplyChannel;
  /** Collapse the panel into a compact "draft added" strip. Used after the
   *  user clicks "Use this" so the full suggestion isn't shown twice
   *  (once here, once in the composer). Parent owns the flag so it can
   *  reset it after the external reply is logged. */
  collapsed?: boolean;
  /** Called when the user clicks "Use this" — parent should fill the
   *  composer AND set collapsed=true. */
  onCollapse?: () => void;
  /** Called when the user clicks "Expand" in the collapsed state. */
  onExpand?: () => void;
}

export function AiReplyPanel({
  clientId,
  conversationId,
  latestSuggestion,
  onUseSuggestion,
  disabled = false,
  contextLabel = null,
  channel = 'email',
  collapsed = false,
  onCollapse,
  onExpand,
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

  const handleUse = (s: InboxAiSuggestion) => {
    onUseSuggestion(s);
    onCollapse?.();
  };

  const handleRegenerate = () => {
    if (onExpand) onExpand();
    generate.mutate({ tone, channel });
  };

  // Button copy reflects the composer surface the suggestion will
  // land in — so the user knows what kind of draft they're getting.
  const suggestLabel =
    channel === 'note'
      ? 'Suggest internal note'
      : channel === 'reply'
        ? 'Suggest reply'
        : 'Suggest email reply';

  // Compact strip — shown after "Use this" so the suggestion text isn't
  // duplicated alongside the now-filled composer.
  if (collapsed && suggestion) {
    return (
      <div className="card px-3 py-2 flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-accent-green-110 shrink-0" />
        <span className="text-xs text-white-80 min-w-0 flex-1 truncate">
          AI draft added to composer
        </span>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={generate.isPending}
          className={cn(
            'text-xs font-medium px-2 py-1 rounded text-white-70 hover:bg-white-10 inline-flex items-center gap-1',
            generate.isPending && 'opacity-50 cursor-not-allowed',
          )}
        >
          <RotateCw
            className={cn('w-3 h-3', generate.isPending && 'animate-spin')}
          />
          {generate.isPending ? 'Regenerating…' : 'Regenerate'}
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="text-xs font-medium px-2 py-1 rounded text-white-70 hover:bg-white-10 inline-flex items-center gap-1"
        >
          <ChevronDown className="w-3 h-3" />
          Expand
        </button>
      </div>
    );
  }

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
        {suggestion && onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="p-1 rounded text-white-40 hover:text-white-100 hover:bg-white-10"
            title="Collapse"
            aria-label="Collapse"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {contextLabel && (
        <div className="flex items-start gap-2 text-[11px] text-white-60 bg-accent-green-110/5 border border-accent-green-110/20 rounded-lg px-2.5 py-1.5">
          <Sparkles className="w-3 h-3 text-accent-green-110 shrink-0 mt-0.5" />
          <span className="leading-snug">
            <span className="text-white-40">Using context:</span>{' '}
            <span className="text-white-90">{contextLabel}</span>
          </span>
        </div>
      )}

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
              onClick={() => handleUse(suggestion)}
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
              onClick={() => generate.mutate({ tone, channel })}
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
          onClick={() => generate.mutate({ tone, channel })}
          disabled={disabled || generate.isPending}
          className={cn(
            'w-full text-xs font-semibold px-3 py-2.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors',
            'bg-accent-green-110 text-sp-bg hover:bg-accent-green-100',
            (disabled || generate.isPending) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {generate.isPending ? 'Generating…' : suggestLabel}
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
