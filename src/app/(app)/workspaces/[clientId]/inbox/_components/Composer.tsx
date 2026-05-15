'use client';

// Tabbed composer — capability-aware. Three possible modes:
//
//   - "Send email"          real outbound via Postmark (when the lead
//                           has an email + provider is configured)
//   - "Log external reply"  records a WORKSPACE message in the thread
//                           without sending anything (always available)
//   - "Internal note"       private team-side note (always available)
//
// When email is NOT available the "Send email" tab still renders but
// is disabled with the reason — keeps the affordance visible so users
// learn what's needed (e.g. "This lead has no email address").

import Link from 'next/link';
import {
  Send,
  StickyNote,
  Sparkles,
  AlertCircle,
  Settings,
  Mail,
  Lock,
} from 'lucide-react';
import type { ReplyCapabilities } from '@/hooks/useInbox';
import { cn } from '@/lib/utils';

export type ComposerMode = 'email' | 'reply' | 'note';

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
  /** Server-resolved capabilities — drives which tabs are enabled. */
  capabilities: ReplyCapabilities;
  /** Inline error from the most recent submit (e.g. provider failed). */
  sendError?: string | null;
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
  capabilities,
  sendError = null,
}: ComposerProps) {
  const isEmail = mode === 'email';
  const isReply = mode === 'reply';
  const isNote = mode === 'note';

  const emailDisabledReason = capabilities.email.available
    ? null
    : capabilities.email.reason ?? 'Email is not available for this conversation.';

  return (
    <div className="card p-0 overflow-hidden">
      {/* Tab row */}
      <div className="flex items-center gap-1 px-2 pt-2 border-b border-white-10">
        <SegButton
          active={isEmail}
          onClick={() => onModeChange('email')}
          icon={<Mail className="w-3 h-3" />}
          tone="primary"
          disabled={!capabilities.email.available}
          disabledTitle={emailDisabledReason}
        >
          Send email
        </SegButton>
        <SegButton
          active={isReply}
          onClick={() => onModeChange('reply')}
          icon={<Send className="w-3 h-3" />}
        >
          Log external reply
        </SegButton>
        <SegButton
          active={isNote}
          onClick={() => onModeChange('note')}
          icon={<StickyNote className="w-3 h-3" />}
          tone="warn"
        >
          Internal note
        </SegButton>
        {fromSuggestion && (isEmail || isReply) && (
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
            isEmail
              ? 'Write the reply you want to send to the lead…'
              : isReply
                ? 'Paste the reply you sent outside Squadpitch…'
                : 'Add a private note for your team…'
          }
          rows={4}
          className="w-full bg-transparent border-0 px-0 py-1 text-sm text-white-90 placeholder:text-white-30 focus:outline-none resize-none"
        />
      </div>

      {/* Helper + action row */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-white-10 bg-white-3">
        <p className="text-[11px] text-white-50 leading-snug min-w-0">
          {isEmail
            ? 'Sends a real email to the lead from your workspace. You can review the draft before sending.'
            : isReply
              ? 'Sending is not connected for this channel. This only records the reply on the thread.'
              : 'Notes stay inside your workspace and are never sent to the lead.'}
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={pending || !body.trim()}
          className={cn(
            'text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shrink-0',
            isEmail
              ? 'bg-accent-green-110 text-sp-bg hover:bg-accent-green-100'
              : isReply
                ? 'bg-white-10 text-white-90 hover:bg-white-15 border border-white-15'
                : 'bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 border border-amber-400/30',
            (pending || !body.trim()) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {isEmail ? (
            <Mail className="w-3 h-3" />
          ) : isReply ? (
            <Send className="w-3 h-3" />
          ) : (
            <StickyNote className="w-3 h-3" />
          )}
          {pending
            ? isEmail
              ? 'Sending…'
              : isReply
                ? 'Logging…'
                : 'Saving…'
            : isEmail
              ? 'Send email'
              : isReply
                ? 'Log external reply'
                : 'Add note'}
        </button>
      </div>

      {/* Send error — inline; never pretend a failed send worked. */}
      {sendError && isEmail && (
        <div className="flex items-start gap-2 px-3 py-2 border-t border-white-10 bg-amber-400/5 text-[11px] text-amber-200/90 leading-snug">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{sendError}</span>
        </div>
      )}

      {/* Capability strip — only shown on the email tab.
          When email is not available, explains why and offers
          a path to fix (e.g. add a contact email). */}
      {isEmail && !capabilities.email.available && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-white-10 bg-amber-400/5">
          <div className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-snug min-w-0">
            <Lock className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{emailDisabledReason}</span>
          </div>
          <Link
            href={`/workspaces/${clientId}/settings/integrations`}
            className="text-[11px] font-medium text-amber-200 hover:text-amber-100 inline-flex items-center gap-1 shrink-0"
          >
            <Settings className="w-3 h-3" />
            Settings
          </Link>
        </div>
      )}

      {/* Legacy log-only strip — only when on the Log external reply
          tab AND email is also unavailable, so users know neither
          mode actually delivers a message. Hidden once email goes
          live for this conversation. */}
      {isReply && !capabilities.email.available && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-white-10 bg-amber-400/5">
          <div className="flex items-start gap-2 text-[11px] text-amber-200/80 leading-snug min-w-0">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <span>Outbound sending is not available for this conversation yet.</span>
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
  tone?: 'default' | 'warn' | 'primary';
  disabled?: boolean;
  disabledTitle?: string | null;
}

function SegButton({
  active,
  onClick,
  icon,
  children,
  tone = 'default',
  disabled = false,
  disabledTitle,
}: SegButtonProps) {
  const activeClass =
    tone === 'warn'
      ? 'text-amber-200 border-b-amber-300'
      : 'text-accent-green-110 border-b-accent-green-110';
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? disabledTitle ?? undefined : undefined}
      className={cn(
        'text-xs font-medium px-3 py-2 border-b-2 -mb-px inline-flex items-center gap-1.5 transition-colors',
        active
          ? activeClass
          : 'text-white-50 hover:text-white-90 border-b-transparent',
        disabled && 'opacity-40 cursor-not-allowed hover:text-white-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
