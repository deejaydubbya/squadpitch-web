'use client';

// Tabbed composer — "Log external reply" or "Internal note".
// Outbound sending is NOT wired yet; the external mode just records
// the reply on the thread. Every piece of copy here is designed to
// make that explicit so users don't think Squadpitch sent a message
// to the lead on their behalf.

import Link from 'next/link';
import { Send, StickyNote, Sparkles, AlertCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ComposerMode = 'reply' | 'note';

interface ComposerProps {
  clientId: string;
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
  clientId,
  mode,
  onModeChange,
  body,
  onBodyChange,
  onSubmit,
  pending,
  fromSuggestion,
}: ComposerProps) {
  const isReply = mode === 'reply';

  return (
    <div className="card p-0 overflow-hidden">
      {/* Tab row */}
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-white-10">
        <SegButton
          active={mode === 'reply'}
          onClick={() => onModeChange('reply')}
          icon={<Send className="w-3 h-3" />}
        >
          Log external reply
        </SegButton>
        <SegButton
          active={mode === 'note'}
          onClick={() => onModeChange('note')}
          icon={<StickyNote className="w-3 h-3" />}
          tone="warn"
        >
          Internal note
        </SegButton>
        {fromSuggestion && isReply && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-accent-green-110">
            <Sparkles className="w-2.5 h-2.5" />
            From AI draft
          </span>
        )}
      </div>

      {/* Textarea */}
      <div className="px-3 pt-3">
        <textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={
            isReply
              ? 'Paste the reply you sent outside Squadpitch…'
              : 'Add a private note for your team…'
          }
          rows={3}
          className="w-full bg-transparent border-0 px-0 py-1 text-sm text-white-90 placeholder:text-white-30 focus:outline-none resize-none"
        />
      </div>

      {/* Helper + action row */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-white-10 bg-white-3">
        <p className="text-[11px] text-white-50 leading-snug min-w-0">
          {isReply
            ? 'Sending is not connected yet. This only records the reply on the thread.'
            : 'Notes stay inside your workspace and are never sent to the lead.'}
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
          {isReply ? (
            <Send className="w-3 h-3" />
          ) : (
            <StickyNote className="w-3 h-3" />
          )}
          {pending
            ? isReply
              ? 'Logging…'
              : 'Saving…'
            : isReply
              ? 'Log external reply'
              : 'Add note'}
        </button>
      </div>

      {/* Product-status strip — only visible on the external reply tab.
          Settings/integrations does exist (verified at scaffold time)
          so the secondary CTA is safe to render. */}
      {isReply && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-white-10 bg-amber-400/5">
          <div className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-snug min-w-0">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Outbound sending is not connected yet.</span>
          </div>
          <Link
            href={`/workspaces/${clientId}/settings/integrations`}
            className="text-[11px] font-medium text-amber-200 hover:text-amber-100 inline-flex items-center gap-1 shrink-0"
          >
            <Settings className="w-3 h-3" />
            Connect email
          </Link>
        </div>
      )}
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
      ? 'text-amber-200 border-b-amber-300'
      : 'text-accent-green-110 border-b-accent-green-110';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'text-xs font-medium px-3 py-2 border-b-2 -mb-px inline-flex items-center gap-1.5 transition-colors',
        active
          ? activeClass
          : 'text-white-50 hover:text-white-90 border-b-transparent',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
