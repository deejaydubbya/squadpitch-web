'use client';

// Tabbed composer — "Log reply" or "Internal note". Outbound
// delivery is logged-only for MVP; the helper copy makes that
// explicit so users don't expect the lead to receive an email.

import { Send, StickyNote, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ComposerMode = 'reply' | 'note';

interface ComposerProps {
  mode: ComposerMode;
  onModeChange: (m: ComposerMode) => void;
  body: string;
  onBodyChange: (s: string) => void;
  onSubmit: () => void;
  pending: boolean;
  /** True when the body was populated from an AI suggestion via "Use this". */
  fromSuggestion: boolean;
}

export function Composer({
  mode,
  onModeChange,
  body,
  onBodyChange,
  onSubmit,
  pending,
  fromSuggestion,
}: ComposerProps) {
  const isReply = mode === 'reply';
  const placeholder = isReply
    ? 'Paste or write the reply you sent outside Squadpitch…'
    : 'Add a private note for your team…';
  const helper = isReply
    ? 'Outbound delivery is not connected yet. This logs your reply on the thread.'
    : 'Notes stay inside the workspace and never reach the lead.';
  const submitLabel = isReply ? 'Log reply' : 'Add note';
  const submitPending = isReply ? 'Logging…' : 'Saving…';

  return (
    <div className="card p-3 space-y-3">
      {/* Segmented control */}
      <div
        className="inline-flex p-0.5 bg-white-5 border border-white-10 rounded-lg"
        role="tablist"
      >
        <SegButton
          active={mode === 'reply'}
          onClick={() => onModeChange('reply')}
          icon={<Send className="w-3 h-3" />}
        >
          Log reply
        </SegButton>
        <SegButton
          active={mode === 'note'}
          onClick={() => onModeChange('note')}
          icon={<StickyNote className="w-3 h-3" />}
          tone="warn"
        >
          Internal note
        </SegButton>
      </div>

      {fromSuggestion && isReply && (
        <div className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-accent-green-110 bg-accent-green-110/10 border border-accent-green-110/20 rounded px-2 py-1">
          <Sparkles className="w-2.5 h-2.5" />
          Drafted from AI suggestion
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => onBodyChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full bg-white-5 border border-white-10 rounded-lg px-3 py-2 text-sm text-white-90 placeholder:text-white-40 focus:outline-none focus:border-white-30 resize-none transition-colors"
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-white-40 leading-snug max-w-[42ch]">
          {helper}
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !body.trim()}
          className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shrink-0',
            isReply
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-100'
              : 'bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 border border-amber-400/30',
            (pending || !body.trim()) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isReply ? <Send className="w-3 h-3" /> : <StickyNote className="w-3 h-3" />}
          {pending ? submitPending : submitLabel}
        </button>
      </div>
    </div>
  );
}

interface SegButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  tone?: 'default' | 'warn';
}

function SegButton({ active, onClick, icon, children, tone = 'default' }: SegButtonProps) {
  const activeClass =
    tone === 'warn'
      ? 'bg-amber-400/15 text-amber-200'
      : 'bg-accent-green-110/15 text-accent-green-110';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'text-xs font-medium px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 transition-colors',
        active ? activeClass : 'text-white-50 hover:text-white-100',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
